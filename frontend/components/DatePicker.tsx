"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "./ui/utils"
import { Button } from "./ui/button"
import { Calendar } from "./ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ 
  date, 
  onDateChange, 
  placeholder = "选择日期", 
  className 
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleTodayClick = () => {
    onDateChange(new Date())
    setOpen(false)
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal rounded-lg transition-all duration-200",
            "hover:bg-accent/50 hover:border-accent-foreground/20",
            "focus:ring-2 focus:ring-primary/20 focus:border-primary",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "yyyy-MM-dd") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border-0 bg-white dark:bg-gray-900" align="start">
        <div className="p-3 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTodayClick}
            className="w-full rounded-lg hover:bg-accent transition-colors"
          >
            今天
          </Button>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
          initialFocus
          className="rounded-xl"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-3",
            month: "space-y-4",
            caption: "flex justify-center pt-1 relative items-center rounded-lg",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md transition-colors",
              "hover:bg-accent"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell:
              "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: cn(
              "h-9 w-9 text-center text-sm p-0 relative",
              "focus-within:relative focus-within:z-20"
            ),
            day: cn(
              "h-9 w-9 p-0 font-normal rounded-lg transition-all duration-200",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:bg-accent focus:text-accent-foreground focus:outline-none",
              "aria-selected:opacity-100"
            ),
            day_range_end: "day-range-end",
            day_selected: cn(
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              "focus:bg-primary focus:text-primary-foreground rounded-lg",
              "shadow-sm"
            ),
            day_today: cn(
              "bg-accent text-accent-foreground font-semibold rounded-lg",
              "relative"
            ),
            day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  )
}