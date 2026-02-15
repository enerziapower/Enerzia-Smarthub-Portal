import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

/**
 * DatePicker Component
 * 
 * A customizable date picker that displays dates in DD-MM-YYYY format
 * while maintaining YYYY-MM-DD format for backend compatibility.
 * 
 * @param {string} value - Date value in YYYY-MM-DD format (for backend)
 * @param {function} onChange - Callback when date changes, receives YYYY-MM-DD string
 * @param {string} placeholder - Placeholder text when no date selected
 * @param {string} className - Additional CSS classes
 * @param {boolean} disabled - Whether the picker is disabled
 * @param {string} id - HTML id attribute
 * @param {string} name - HTML name attribute
 * @param {object} props - Additional props passed to the trigger button
 */
function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  id,
  name,
  "data-testid": dataTestId,
  ...props
}) {
  const [open, setOpen] = React.useState(false)

  // Parse YYYY-MM-DD string to Date object
  const parseValue = (val) => {
    if (!val) return undefined
    
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [year, month, day] = val.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return isValid(date) ? date : undefined
    }
    
    // Handle DD-MM-YYYY format (for backwards compatibility)
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [day, month, year] = val.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return isValid(date) ? date : undefined
    }
    
    return undefined
  }

  const selectedDate = parseValue(value)

  // Format date for display (DD-MM-YYYY)
  const formatDisplay = (date) => {
    if (!date || !isValid(date)) return ""
    return format(date, "dd-MM-yyyy")
  }

  // Format date for backend (YYYY-MM-DD)
  const formatForBackend = (date) => {
    if (!date || !isValid(date)) return ""
    return format(date, "yyyy-MM-dd")
  }

  const handleSelect = (date) => {
    if (date) {
      onChange(formatForBackend(date))
    } else {
      onChange("")
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          name={name}
          variant="outline"
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          {...props}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? formatDisplay(selectedDate) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Utility function to format date strings for display (DD-MM-YYYY)
 * Can be used for displaying dates in tables, etc.
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return ""
  
  // If already in DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr
  
  // Handle YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [year, month, day] = dateStr.split('T')[0].split('-')
    return `${day}-${month}-${year}`
  }
  
  // Handle DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-')
  }
  
  // Try parsing as Date object
  try {
    const date = new Date(dateStr)
    if (isValid(date)) {
      return format(date, "dd-MM-yyyy")
    }
  } catch (e) {
    console.error('Date parsing error:', e)
  }
  
  return dateStr
}

/**
 * Utility function to format date strings for backend (YYYY-MM-DD)
 */
function formatDateForBackend(dateStr) {
  if (!dateStr) return ""
  
  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  
  // Handle DD-MM-YYYY format
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-')
    return `${year}-${month}-${day}`
  }
  
  // Handle DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/')
    return `${year}-${month}-${day}`
  }
  
  return dateStr
}

export { DatePicker, formatDateDisplay, formatDateForBackend }
