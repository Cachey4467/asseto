import * as React from "react"
import { Search, Plus, Bell, Settings, User, LogOut } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { CurrencySelector } from "./CurrencySelector"

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        {/* Logo */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary"></div>
            <span className="font-bold text-xl">Dashboard</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="ml-8 flex items-center space-x-6">
          <a href="#" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Overview
          </a>
          <a href="#" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Projects
          </a>
          <a href="#" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Analytics
          </a>
          <a href="#" className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
            Reports
          </a>
        </div>

        {/* Search */}
        <div className="ml-auto flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-[300px] pl-9"
            />
          </div>

          {/* New Project Button */}
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>

          {/* Currency Selector */}
          <div className="flex items-center">
            <CurrencySelector size="sm" showRefreshButton={false} />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>

          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/api/placeholder/32/32" alt="Avatar" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">John Doe</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    john@example.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  )
}