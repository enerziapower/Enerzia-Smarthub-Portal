import * as React from "react"
import { format, parse, isValid, setMonth, setYear, getMonth, getYear } from "date-fns"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// Generate year options (from 2000 to current year + 10)
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2000 + 11 }, (_, i) => 2000 + i)

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

/**
 * DatePicker Component
 * 
 * A customizable date picker that displays dates in DD-MM-YYYY format
 * while maintaining YYYY-MM-DD format for backend compatibility.
 * Features: Direct text input, month/year dropdowns for quick navigation.
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
  const [inputValue, setInputValue] = React.useState("")
  const [displayMonth, setDisplayMonth] = React.useState(new Date())

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

  // Update input value when value prop changes
  React.useEffect(() => {
    if (selectedDate) {
      setInputValue(format(selectedDate, "dd-MM-yyyy"))
      setDisplayMonth(selectedDate)
    } else {
      setInputValue("")
    }
  }, [value])

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
      setInputValue(formatDisplay(date))
    } else {
      onChange("")
      setInputValue("")
    }
    setOpen(false)
  }

  // Handle direct text input
  const handleInputChange = (e) => {
    const val = e.target.value
    setInputValue(val)
    
    // Try to parse various formats
    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [day, month, year] = val.split('-').map(Number)
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
        const date = new Date(year, month - 1, day)
        if (isValid(date)) {
          onChange(formatForBackend(date))
          setDisplayMonth(date)
        }
      }
    }
    // DD/MM/YYYY
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [day, month, year] = val.split('/').map(Number)
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
        const date = new Date(year, month - 1, day)
        if (isValid(date)) {
          onChange(formatForBackend(date))
          setDisplayMonth(date)
        }
      }
    }
  }

  // Handle input blur - validate and format
  const handleInputBlur = () => {
    if (inputValue && selectedDate) {
      setInputValue(formatDisplay(selectedDate))
    } else if (!inputValue) {
      onChange("")
    }
  }

  // Handle month change from dropdown
  const handleMonthChange = (monthIndex) => {
    const newDate = setMonth(displayMonth, monthIndex)
    setDisplayMonth(newDate)
  }

  // Handle year change from dropdown
  const handleYearChange = (year) => {
    const newDate = setYear(displayMonth, year)
    setDisplayMonth(newDate)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative flex items-center", className)}>
          <input
            type="text"
            id={id}
            name={name}
            disabled={disabled}
            data-testid={dataTestId}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={cn(
              "w-full h-10 pl-10 pr-3 py-2 text-sm border border-input rounded-md bg-background",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed",
              !selectedDate && "text-muted-foreground"
            )}
            {...props}
          />
          <CalendarIcon 
            className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" 
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Month and Year Selectors */}
        <div className="flex items-center justify-between p-3 border-b">
          <select
            value={getMonth(displayMonth)}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={getYear(displayMonth)}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
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
