import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

const CATEGORY_SCHEMAS = {
  // Travel
  'Rail': [
    { key: 'from_location', label: 'From Location', type: 'text', required: true },
    { key: 'to_location', label: 'To Location', type: 'text', required: true },
    { key: 'travel_date', label: 'Travel Date', type: 'date', required: true },
    { key: 'ticket_number', label: 'Ticket / Booking ID', type: 'text' },
    { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
  ],
  'Ola/Uber': [
    { key: 'mode_type', label: 'Mode Type', type: 'select', options: ['Ola', 'Uber', 'Auto', 'Taxi'], required: true },
    { key: 'from_location', label: 'From Location', type: 'text', required: true },
    { key: 'to_location', label: 'To Location', type: 'text', required: true },
    { key: 'travel_date', label: 'Travel Date', type: 'date', required: true },
    { key: 'ride_id', label: 'Ride ID', type: 'text' },
    { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
  ],
  'Air': [
    { key: 'from_location', label: 'From City', type: 'text', required: true },
    { key: 'to_location', label: 'To City', type: 'text', required: true },
    { key: 'travel_date', label: 'Travel Date', type: 'date', required: true },
    { key: 'pnr_number', label: 'PNR / Booking ID', type: 'text' },
    { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
  ],
  'Fuel': [
    { key: 'vehicle_number', label: 'Vehicle Number', type: 'text', required: true },
    { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'CNG', 'Electric'], required: true },
    { key: 'quantity', label: 'Quantity (Liters)', type: 'number', required: true },
    { key: 'rate_per_liter', label: 'Rate per Liter (INR)', type: 'number', required: true },
    { key: 'amount', label: 'Total Amount (INR)', type: 'number', required: true },
    { key: 'fuel_date', label: 'Date', type: 'date', required: true },
  ],
  'Hotel': [
    { key: 'hotel_name', label: 'Hotel Name', type: 'text', required: true },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'check_in', label: 'Check-in Date', type: 'date', required: true },
    { key: 'check_out', label: 'Check-out Date', type: 'date', required: true },
    { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
  ],
  'Lunch/Dinner': [
    { key: 'restaurant_name', label: 'Restaurant / Vendor Name', type: 'text', required: true },
    { key: 'meal_type', label: 'Meal Type', type: 'select', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'], required: true },
    { key: 'expense_date', label: 'Date', type: 'date', required: true },
    { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
  ],
};

const DEFAULT_SCHEMA = [
  { key: 'vendor_name', label: 'Vendor / Supplier Name', type: 'text', required: true },
  { key: 'expense_date', label: 'Expense Date', type: 'date', required: true },
  { key: 'bill_number', label: 'Bill / Invoice Number', type: 'text' },
  { key: 'amount', label: 'Amount (INR)', type: 'number', required: true },
  { key: 'purpose', label: 'Purpose / Description', type: 'text', required: true },
];

function getSchema(category) {
  if (!category) return DEFAULT_SCHEMA;
  const title = category.title || '';
  for (const key of Object.keys(CATEGORY_SCHEMAS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return CATEGORY_SCHEMAS[key];
  }
  return DEFAULT_SCHEMA;
}

export default function ClaimDynamicForm({ category, headName, formData, onChange, documents }) {
  const schema = getSchema(category);
  const autofillSource = documents?.[0]?.extractedData || {};

  const handleChange = (key, val) => {
    onChange({ ...formData, [key]: val });
  };

  const isAutofilled = (key) => {
    const mapped = {
      vendor_name: autofillSource.vendorName,
      restaurant_name: autofillSource.vendorName,
      hotel_name: autofillSource.vendorName,
      amount: autofillSource.totalAmount,
      expense_date: autofillSource.billDate,
      fuel_date: autofillSource.billDate,
      travel_date: autofillSource.billDate,
      check_in: autofillSource.checkIn,
      check_out: autofillSource.checkOut,
      bill_number: autofillSource.billNumber,
      from_location: autofillSource.from,
      to_location: autofillSource.to,
      ride_id: autofillSource.rideId,
    };
    return !!mapped[key] && formData[key] == mapped[key];
  };

  return (
    <div className="max-w-2xl bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-bold text-gray-900">{headName} — {category?.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Fill in the expense details below</p>
        </div>
        {category?.policy_limit && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Policy Limit</p>
            <p className="text-sm font-bold text-amber-600">₹{category.policy_limit.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {schema.map(field => (
          <div key={field.key} className={`space-y-1 ${field.type === 'text' && field.key === 'purpose' ? 'col-span-2' : ''}`}>
            <Label className="text-xs flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
              {isAutofilled(field.key) && (
                <Badge className="ml-1 bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" /> OCR
                </Badge>
              )}
            </Label>
            {field.type === 'select' ? (
              <Select
                value={formData[field.key] || ''}
                onValueChange={v => handleChange(field.key, v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={field.type}
                value={formData[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.label}
                className={`h-9 text-sm ${isAutofilled(field.key) ? 'border-purple-300 bg-purple-50' : ''}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
        <div className="space-y-1">
          <Label className="text-xs">Expense Period From</Label>
          <Input type="date" value={formData.date_from || ''} onChange={e => handleChange('date_from', e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Expense Period To</Label>
          <Input type="date" value={formData.date_to || ''} onChange={e => handleChange('date_to', e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
    </div>
  );
}