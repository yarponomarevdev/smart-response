/**
 * DynamicFieldsTab - Вкладка управления динамическими полями формы
 * Позволяет добавлять, редактировать, удалять и переупорядочивать поля
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { FieldTypeSelector } from "./field-type-selector"
import { FieldForm } from "./field-form"
import { FieldListItem } from "./field-list-item"
import {
  useFormFields,
  useSaveFormField,
  useDeleteFormField,
  useReorderFormFields,
  type FormField,
  type FormFieldInput,
} from "@/lib/hooks"
import type { FieldType } from "@/app/actions/form-fields"

interface DynamicFieldsTabProps {
  formId: string | null
}

export function DynamicFieldsTab({ formId }: DynamicFieldsTabProps) {
  // Состояние диалогов
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Текущее редактируемое/удаляемое поле
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>("text")
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [deletingField, setDeletingField] = useState<FormField | null>(null)

  // Хуки для работы с данными
  const { data: fieldsData, isLoading: isLoadingFields } = useFormFields(formId)
  const saveFieldMutation = useSaveFormField()
  const deleteFieldMutation = useDeleteFormField()
  const reorderFieldsMutation = useReorderFormFields()

  const fields = fieldsData?.fields || []

  // Настройка сенсоров для drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Обработчик завершения перетаскивания
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || !formId) return

    const oldIndex = fields.findIndex((field) => field.id === active.id)
    const newIndex = fields.findIndex((field) => field.id === over.id)

    if (oldIndex !== newIndex) {
      const newFields = arrayMove(fields, oldIndex, newIndex)

      // Используем mutate вместо mutateAsync для неблокирующего обновления
      // Оптимистичное обновление уже обрабатывается в хуке
      reorderFieldsMutation.mutate(
        {
          formId,
          fieldIds: newFields.map((f) => f.id),
        },
        {
          onSuccess: () => {
            toast.success("Порядок полей изменен")
          },
          onError: () => {
            toast.error("Ошибка изменения порядка")
          },
        }
      )
    }
  }

  // Открыть диалог выбора типа поля
  const handleAddField = () => {
    setEditingField(null)
    setShowTypeSelector(true)
  }

  // После выбора типа - открыть форму редактирования
  const handleTypeSelect = (type: FieldType) => {
    setSelectedFieldType(type)
    setShowFieldForm(true)
  }

  // Открыть форму редактирования существующего поля
  const handleEditField = (field: FormField) => {
    setEditingField(field)
    setSelectedFieldType(field.field_type)
    setShowFieldForm(true)
  }

  // Сохранить поле
  const handleSaveField = async (data: FormFieldInput) => {
    if (!formId) return

    try {
      await saveFieldMutation.mutateAsync({ formId, fieldData: data })
      toast.success(data.id ? "Поле обновлено" : "Поле добавлено")
      setShowFieldForm(false)
      setEditingField(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка сохранения поля")
    }
  }

  // Подтверждение удаления
  const handleDeleteClick = (field: FormField) => {
    setDeletingField(field)
    setShowDeleteDialog(true)
  }

  // Удалить поле
  const handleDeleteConfirm = async () => {
    if (!formId || !deletingField) return

    try {
      await deleteFieldMutation.mutateAsync({ formId, fieldId: deletingField.id })
      toast.success("Поле удалено")
      setShowDeleteDialog(false)
      setDeletingField(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления поля")
    }
  }


  if (!formId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Выберите форму для управления полями
      </div>
    )
  }

  if (isLoadingFields) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Список полей */}
      {fields.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {fields.map((field) => (
                <FieldListItem
                  key={field.id}
                  id={field.id}
                  field={field}
                  onEdit={() => handleEditField(field)}
                  onDelete={() => handleDeleteClick(field)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          Нет добавленных полей
        </div>
      )}

      {/* Кнопка добавления */}
      <Button
        onClick={handleAddField}
        className="w-full h-12 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <Plus className="h-4 w-4 mr-2" />
        Добавить поле
      </Button>

      <p className="text-xs text-muted-foreground">
        *выберите как минимум одно поле
      </p>

      {/* Диалог выбора типа поля */}
      <FieldTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        onSelect={handleTypeSelect}
      />

      {/* Форма редактирования поля */}
      <FieldForm
        open={showFieldForm}
        onOpenChange={setShowFieldForm}
        fieldType={selectedFieldType}
        initialData={
          editingField
            ? {
                id: editingField.id,
                field_type: editingField.field_type,
                field_label: editingField.field_label,
                field_key: editingField.field_key,
                is_required: editingField.is_required,
                options: editingField.options,
              }
            : undefined
        }
        onSave={handleSaveField}
        isLoading={saveFieldMutation.isPending}
      />

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить поле?</AlertDialogTitle>
            <AlertDialogDescription>
              Поле &quot;{deletingField?.field_label}&quot; будет удалено. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFieldMutation.isPending ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
