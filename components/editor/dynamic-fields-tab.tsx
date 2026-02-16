/**
 * DynamicFieldsTab - Вкладка управления динамическими полями формы
 * Позволяет добавлять, редактировать, удалять и переупорядочивать поля
 * Теперь все элементы первой страницы (заголовки, дисклеймер, кнопка) - тоже динамические поля
 */
"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2, ListPlus, Type, Link, List, ListChecks, CheckSquare, Image } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { FieldForm } from "./field-form"
import { FieldListItem } from "./field-list-item"
import { StaticLayoutFields } from "./static-layout-fields"
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
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

type StaticFields = {
  static_heading?: string | null
  static_subheading?: string | null
  static_body_text?: string | null
  static_disclaimer?: string | null
}

interface DynamicFieldsTabProps {
  formId: string | null
}

export function DynamicFieldsTab({ formId }: DynamicFieldsTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  
  // Состояние диалогов
  const [showFieldForm, setShowFieldForm] = useState(false)

  // Список типов полей
  const FIELD_TYPES = useMemo(() => [
    {
      type: "text" as FieldType,
      label: t("editor.fieldTypes.text"),
      icon: <Type className="h-4 w-4 mr-2" />,
    },
    {
      type: "url" as FieldType,
      label: t("editor.fieldTypes.url"),
      icon: <Link className="h-4 w-4 mr-2" />,
    },
    {
      type: "select" as FieldType,
      label: t("editor.fieldTypes.select"),
      icon: <List className="h-4 w-4 mr-2" />,
    },
    {
      type: "multiselect" as FieldType,
      label: t("editor.fieldTypes.multiselect"),
      icon: <ListChecks className="h-4 w-4 mr-2" />,
    },
    {
      type: "checkbox" as FieldType,
      label: t("editor.fieldTypes.checkbox"),
      icon: <CheckSquare className="h-4 w-4 mr-2" />,
    },
    {
      type: "image" as FieldType,
      label: t("editor.fieldTypes.image"),
      icon: <Image className="h-4 w-4 mr-2" />,
    },
  ], [t])

  // Текущее редактируемое/удаляемое поле
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>("text")
  const [editingField, setEditingField] = useState<FormField | null>(null)

  // Хуки для работы с данными
  const { data: fieldsData, isLoading: isLoadingFields } = useFormFields(formId)
  const saveFieldMutation = useSaveFormField()
  const deleteFieldMutation = useDeleteFormField()
  const reorderFieldsMutation = useReorderFormFields()

  const fields = fieldsData?.fields || []

  // Загрузка статичных полей оформления
  const { data: staticFieldsData } = useQuery({
    queryKey: ["staticLayoutFields", formId],
    queryFn: async () => {
      if (!formId) return null
      const supabase = createClient()
      const { data, error } = await supabase
        .from("forms")
        .select("static_heading, static_subheading, static_body_text, static_disclaimer")
        .eq("id", formId)
        .single()
      
      if (error) throw error
      return data as StaticFields
    },
    enabled: !!formId,
    staleTime: 1 * 60 * 1000, // Данные свежие 1 минуту
    refetchOnMount: true, // Перезагружаем данные при монтировании компонента для синхронизации
  })

  // Настройка сенсоров для drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
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
  const handleDeleteClick = async (field: FormField) => {
    if (!formId) return

    try {
      await deleteFieldMutation.mutateAsync({ formId, fieldId: field.id })
      toast.success(t("editor.dynamicFieldsTab.fieldDeleted"))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("editor.dynamicFieldsTab.fieldDeleteError"))
    }
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-10">
      {/* Статичные поля оформления */}
      <div className="lg:col-span-5">
        <StaticLayoutFields
          formId={formId}
          initialData={staticFieldsData || undefined}
        />
      </div>

      {/* Динамические поля формы */}
      <div className="lg:col-span-6 xl:col-span-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <ListPlus className="h-5 w-5" />
              {t("editor.dynamicFieldsTab.title")}
            </CardTitle>
            <CardDescription>
              {t("editor.dynamicFieldsTab.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  <div className="space-y-3">
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

            {/* Кнопка добавления (Dropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-xl border-dashed border-2 hover:bg-accent hover:text-accent-foreground transition-all hover:scale-[1.01] active:scale-[0.99] text-base"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("editor.dynamicFieldsTab.addField")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                {FIELD_TYPES.map((fieldType) => (
                  <DropdownMenuItem
                    key={fieldType.type}
                    onClick={() => {
                      setEditingField(null)
                      handleTypeSelect(fieldType.type)
                    }}
                    className="h-10 cursor-pointer"
                  >
                    {fieldType.icon}
                    {fieldType.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <p className="text-xs text-muted-foreground font-light text-center">
              {t("editor.formDataTab.minOneField")}
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Форма редактирования поля */}
      <FieldForm
        open={showFieldForm}
        onOpenChange={setShowFieldForm}
        fieldType={selectedFieldType}
        formId={formId}
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

    </div>
  )
}
