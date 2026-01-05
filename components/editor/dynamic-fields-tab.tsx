/**
 * DynamicFieldsTab - Вкладка управления динамическими полями формы
 * Позволяет добавлять, редактировать, удалять и переупорядочивать поля
 * Теперь все элементы первой страницы (заголовки, дисклеймер, кнопка) - тоже динамические поля
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
import { useTranslation } from "@/lib/i18n"
import type { FieldType } from "@/app/actions/form-fields"

interface DynamicFieldsTabProps {
  formId: string | null
}

export function DynamicFieldsTab({ formId }: DynamicFieldsTabProps) {
  const { t } = useTranslation()
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
            toast.success(t("editor.dynamicFieldsTab.orderChanged"))
          },
          onError: () => {
            toast.error(t("editor.dynamicFieldsTab.orderChangeError"))
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
      toast.success(data.id ? t("editor.dynamicFieldsTab.fieldUpdated") : t("editor.dynamicFieldsTab.fieldAdded"))
      setShowFieldForm(false)
      setEditingField(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("editor.dynamicFieldsTab.fieldSaveError"))
    }
  }

  // Подтверждение удаления
  const handleDeleteClick = (field: FormField) => {
    setDeletingField(field)
    setShowDeleteDialog(true)
  }

  // Быстрое обновление поля (inline редактирование)
  const handleFieldUpdate = async (
    fieldId: string,
    updates: Partial<Pick<FormField, "field_label" | "placeholder">>
  ) => {
    if (!formId) return

    const field = fields.find((f) => f.id === fieldId)
    if (!field) return

    try {
      await saveFieldMutation.mutateAsync({
        formId,
        fieldData: {
          id: field.id,
          field_type: field.field_type,
          field_label: updates.field_label ?? field.field_label,
          field_key: field.field_key,
          placeholder: updates.placeholder !== undefined ? (updates.placeholder || undefined) : (field.placeholder || undefined),
          is_required: field.is_required,
          options: field.options,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("editor.dynamicFieldsTab.fieldUpdateError"))
      throw error // Пробрасываем ошибку для InlineEditableText
    }
  }

  // Удалить поле
  const handleDeleteConfirm = async () => {
    if (!formId || !deletingField) return

    try {
      await deleteFieldMutation.mutateAsync({ formId, fieldId: deletingField.id })
      toast.success(t("editor.dynamicFieldsTab.fieldDeleted"))
      setShowDeleteDialog(false)
      setDeletingField(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("editor.dynamicFieldsTab.fieldDeleteError"))
    }
  }

  if (!formId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("editor.dynamicFieldsTab.selectForm")}
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
    <div className="space-y-6 sm:space-y-8 max-w-2xl">
      <div>
        <h3 className="text-2xl sm:text-3xl font-bold mb-2">{t("editor.dynamicFieldsTab.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("editor.dynamicFieldsTab.description")}
        </p>
      </div>

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
            <div className="space-y-3 sm:space-y-4">
              {fields.map((field) => (
                <FieldListItem
                  key={field.id}
                  id={field.id}
                  field={field}
                  onEdit={() => handleEditField(field)}
                  onDelete={() => handleDeleteClick(field)}
                  onFieldUpdate={handleFieldUpdate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          {t("editor.dynamicFieldsTab.noFields")}
        </div>
      )}

      {/* Кнопка добавления */}
      <Button
        onClick={handleAddField}
        className="w-full h-14 rounded-[18px] bg-black text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] text-base sm:text-lg"
      >
        <Plus className="h-5 w-5 mr-2" />
        {t("editor.dynamicFieldsTab.addField")}
      </Button>

      <p className="text-sm sm:text-base text-muted-foreground font-light">
        {t("editor.formDataTab.minOneField")}
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
                placeholder: editingField.placeholder || undefined,
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
            <AlertDialogTitle>{t("editor.dynamicFieldsTab.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("editor.dynamicFieldsTab.deleteDialog.description", { label: deletingField?.field_label || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("editor.dynamicFieldsTab.deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFieldMutation.isPending ? t("editor.dynamicFieldsTab.deleteDialog.deleting") : t("editor.dynamicFieldsTab.deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
