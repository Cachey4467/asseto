import * as React from "react"
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "../ui/context-menu"
import { Plus, FolderPlus, Trash2, Edit, DollarSign } from "lucide-react"
import { AssetNode } from "../../utils/assetUtils"
import { ASSET_TYPES, getContextMenuOptions, ContextMenuItem as AssetContextMenuItem } from "../../utils/assetTypes"

interface AssetContextMenuProps {
  node: AssetNode
  onContextMenu: (action: string, node: AssetNode) => void
}

export function AssetContextMenu({ node, onContextMenu }: AssetContextMenuProps) {
  const options = getContextMenuOptions(node.type as any)

  const getIcon = (iconId: string) => {
    switch (iconId) {
      case '➕': return <Plus className="w-4 h-4" />
      case '📁': return <FolderPlus className="w-4 h-4" />
      case '✏️': return <Edit className="w-4 h-4" />
      case '🗑️': return <Trash2 className="w-4 h-4" />
      case '💰': return <DollarSign className="w-4 h-4" />
      default: return <Plus className="w-4 h-4" />
    }
  }

  return (
    <ContextMenuContent>
      {options.map((option, index) => {
        if (option.id === 'separator') {
          return <ContextMenuSeparator key={`separator-${index}`} />
        }

        // 类型守卫：检查是否为普通菜单选项
        if ('label' in option && 'icon' in option) {
          return (
            <ContextMenuItem
              key={option.id}
              onClick={() => onContextMenu(option.id, node)}
              className={option.danger ? "text-red-600" : ""}
            >
              {getIcon(option.icon)}
              <span className="ml-2">{option.label}</span>
            </ContextMenuItem>
          )
        }
        
        return null
      })}
    </ContextMenuContent>
  )
}