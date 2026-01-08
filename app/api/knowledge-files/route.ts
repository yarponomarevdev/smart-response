/**
 * API для работы с файлами базы знаний
 * POST - загрузка файла
 * GET - получение списка файлов
 * DELETE - удаление файла
 */

import { createClient } from "@/lib/supabase/server"
import { isSupportedFileType } from "@/lib/file-parser"
import { checkStorageLimit } from "@/app/actions/storage"
import { MAX_FILE_SIZE } from "@/lib/constants/storage"

// Максимальное количество файлов на форму
const MAX_FILES_PER_FORM = 10

// Разрешённые MIME типы
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]

/**
 * GET - Получение списка файлов формы
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const formId = searchParams.get("formId")

    if (!formId) {
      return Response.json({ error: "formId обязателен" }, { status: 400 })
    }

    const supabase = await createClient()

    // Проверяем авторизацию
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Проверяем, что пользователь владелец формы
    const { data: form } = await supabase.from("forms").select("owner_id").eq("id", formId).single()

    if (!form || form.owner_id !== user.id) {
      return Response.json({ error: "Нет доступа к этой форме" }, { status: 403 })
    }

    // Получаем список файлов
    const { data: files, error } = await supabase
      .from("form_knowledge_files")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Ошибка получения файлов:", error)
      return Response.json({ error: "Ошибка базы данных" }, { status: 500 })
    }

    return Response.json({ files: files || [] })
  } catch (error) {
    console.error("Ошибка GET /api/knowledge-files:", error)
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}

/**
 * POST - Загрузка файла
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // Проверяем авторизацию
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Получаем FormData
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const formId = formData.get("formId") as string | null

    if (!file || !formId) {
      return Response.json({ error: "file и formId обязательны" }, { status: 400 })
    }

    // Проверяем, что пользователь владелец формы
    const { data: form } = await supabase.from("forms").select("owner_id").eq("id", formId).single()

    if (!form || form.owner_id !== user.id) {
      return Response.json({ error: "Нет доступа к этой форме" }, { status: 403 })
    }

    // Проверяем количество файлов
    const { count } = await supabase
      .from("form_knowledge_files")
      .select("*", { count: "exact", head: true })
      .eq("form_id", formId)

    if (count !== null && count >= MAX_FILES_PER_FORM) {
      return Response.json(
        { error: `Достигнут лимит файлов (${MAX_FILES_PER_FORM})` },
        { status: 400 }
      )
    }

    // Проверяем размер файла (1 МБ)
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `Файл слишком большой. Максимальный размер: 1 МБ` },
        { status: 400 }
      )
    }

    // Проверяем лимит хранилища пользователя
    const { canUpload, currentUsage, limit } = await checkStorageLimit(user.id, file.size)
    if (!canUpload && limit !== null) {
      const currentMB = Math.round(currentUsage / 1024 / 1024 * 10) / 10
      const limitMB = Math.round(limit / 1024 / 1024)
      return Response.json(
        { error: `Превышен лимит хранилища (${currentMB}/${limitMB} МБ). Удалите ненужные файлы или обратитесь к администратору.` },
        { status: 400 }
      )
    }

    // Проверяем тип файла
    const isAllowedType =
      ALLOWED_MIME_TYPES.includes(file.type) || isSupportedFileType(file.type, file.name)

    if (!isAllowedType) {
      return Response.json(
        { error: "Неподдерживаемый тип файла. Разрешены: PDF, DOCX, DOC, TXT, MD, CSV, JSON" },
        { status: 400 }
      )
    }

    // Генерируем уникальное имя файла
    const fileExt = file.name.split(".").pop() || "bin"
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const filePath = `${formId}/${uniqueFileName}`

    // Загружаем файл в Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from("knowledge-files")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Ошибка загрузки в Storage:", uploadError)
      return Response.json({ error: "Ошибка загрузки файла" }, { status: 500 })
    }

    // Сохраняем метаданные в БД
    const { data: fileRecord, error: dbError } = await supabase
      .from("form_knowledge_files")
      .insert({
        form_id: formId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || `application/${fileExt}`,
        file_size: file.size,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Ошибка сохранения метаданных:", dbError)
      // Пытаемся удалить загруженный файл
      await supabase.storage.from("knowledge-files").remove([filePath])
      return Response.json({ error: "Ошибка сохранения метаданных" }, { status: 500 })
    }

    return Response.json({ file: fileRecord })
  } catch (error) {
    console.error("Ошибка POST /api/knowledge-files:", error)
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}

/**
 * DELETE - Удаление файла
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
      return Response.json({ error: "fileId обязателен" }, { status: 400 })
    }

    const supabase = await createClient()

    // Проверяем авторизацию
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Не авторизован" }, { status: 401 })
    }

    // Получаем информацию о файле
    const { data: fileRecord } = await supabase
      .from("form_knowledge_files")
      .select("*, forms!inner(owner_id)")
      .eq("id", fileId)
      .single()

    if (!fileRecord) {
      return Response.json({ error: "Файл не найден" }, { status: 404 })
    }

    // Проверяем права доступа
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((fileRecord as any).forms?.owner_id !== user.id) {
      return Response.json({ error: "Нет доступа к этому файлу" }, { status: 403 })
    }

    // Удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from("knowledge-files")
      .remove([fileRecord.file_path])

    if (storageError) {
      console.error("Ошибка удаления из Storage:", storageError)
      // Продолжаем удаление из БД даже если файл не найден в Storage
    }

    // Удаляем метаданные из БД
    const { error: dbError } = await supabase
      .from("form_knowledge_files")
      .delete()
      .eq("id", fileId)

    if (dbError) {
      console.error("Ошибка удаления из БД:", dbError)
      return Response.json({ error: "Ошибка удаления файла" }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Ошибка DELETE /api/knowledge-files:", error)
    return Response.json({ error: "Внутренняя ошибка сервера" }, { status: 500 })
  }
}
