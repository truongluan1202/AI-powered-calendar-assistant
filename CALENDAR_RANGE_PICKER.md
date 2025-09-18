# 📅 Calendar Range Picker

A sophisticated date range picker component inspired by Google Calendar's design, seamlessly integrated with your AI-powered calendar assistant.

## ✨ Features

### 🎯 **Google Calendar-Inspired Design**

- Clean, modern interface matching Google Calendar's aesthetic
- Subtle animations and hover effects
- Consistent with your app's design system
- Full dark mode support

### 🗓️ **Interactive Calendar**

- **Visual Range Selection**: Click and drag to select date ranges
- **Month Navigation**: Easy navigation between months
- **Today Indicator**: Current date is highlighted
- **Hover Preview**: See range preview while selecting
- **Responsive Design**: Works perfectly on all screen sizes

### ⚡ **Quick Presets**

- **Today**: Events for today only
- **This Week**: Next 7 days
- **Next 2 Weeks**: Next 14 days
- **This Month**: Next 30 days
- **Next 3 Months**: Next 90 days

### 🎨 **Visual Feedback**

- **Range Highlighting**: Selected dates are visually highlighted
- **Start/End Indicators**: Clear visual distinction for range boundaries
- **Hover States**: Smooth hover animations
- **Loading States**: Disabled state during API calls

## 🚀 Usage

### Basic Implementation

```tsx
import CalendarRangePicker, { type CalendarRange } from "./CalendarRangePicker";

const [selectedRange, setSelectedRange] = useState<CalendarRange>({
  startDate: null,
  endDate: null,
  label: "Select date range",
  timeMin: "",
  timeMax: "",
});

<CalendarRangePicker
  selectedRange={selectedRange}
  onRangeChange={setSelectedRange}
  isLoading={false}
/>;
```

### Integration with Calendar Events

```tsx
const handleRangeChange = (range: CalendarRange) => {
  setSelectedRange(range);
  if (range.timeMin && range.timeMax) {
    fetchEvents({ timeMin: range.timeMin, timeMax: range.timeMax });
  }
};
```

## 🎨 Design System

### Colors

- **Primary**: Blue (#3B82F6) for selected dates
- **Secondary**: Gray tones for unselected dates
- **Accent**: Blue-100 for range highlighting
- **Text**: Gray-700/300 for optimal contrast

### Typography

- **Headers**: text-lg font-semibold
- **Dates**: text-sm
- **Labels**: text-xs font-medium

### Spacing

- **Padding**: p-4 for main sections
- **Gaps**: gap-1 for date grid
- **Margins**: mt-2, mt-3 for section spacing

## 🔧 Technical Details

### Props Interface

```typescript
interface CalendarRangePickerProps {
  selectedRange: CalendarRange;
  onRangeChange: (range: CalendarRange) => void;
  isLoading?: boolean;
}

type CalendarRange = {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
  timeMin: string;
  timeMax: string;
};
```

### Key Features

- **TypeScript**: Fully typed for better development experience
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Performance**: Optimized re-renders with proper state management
- **Responsive**: Mobile-first design approach

## 🎯 User Experience

### Selection Flow

1. **Click to Start**: Click any date to begin range selection
2. **Drag to Select**: Click and drag to select a range
3. **Visual Feedback**: See range highlighted in real-time
4. **Auto-Complete**: Range selection completes automatically
5. **Instant Update**: Events fetch immediately upon selection

### Quick Actions

- **Preset Buttons**: One-click selection for common ranges
- **Clear Button**: Reset selection easily
- **Today Button**: Jump to current month
- **Month Navigation**: Navigate between months

## 🌟 Benefits

### For Users

- **Intuitive**: Familiar Google Calendar interface
- **Fast**: Quick presets for common selections
- **Flexible**: Custom date range selection
- **Visual**: Clear visual feedback throughout

### For Developers

- **Reusable**: Drop-in component for any date selection needs
- **Customizable**: Easy to modify styling and behavior
- **Type-Safe**: Full TypeScript support
- **Well-Documented**: Clear props and usage examples

## 🔄 Integration

The calendar range picker is fully integrated with:

- **Calendar Pane**: Main calendar view component
- **Event Fetching**: Automatic event loading on range change
- **State Management**: Proper state synchronization
- **Error Handling**: Graceful error states and recovery

This creates a seamless, professional calendar experience that matches the quality of commercial calendar applications.
