import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Calculator } from 'lucide-react';

// ─── RATES ────────────────────────────────────────────────────────
const OWN_VEHICLE_RATES = {
  'Car': { 'Petrol': 12, 'Diesel': 10, 'EV': 8 },
  'Bike': { 'Petrol': 6, 'Diesel': 6, 'EV': 3 },
};

// ─── BASE COMPONENTS ──────────────────────────────────────────────
function Field({ label, required, autofilled, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {autofilled && (
          <Badge className="ml-1 bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">
            <Sparkles className="w-2.5 h-2.5 mr-0.5" /> OCR
          </Badge>
        )}
      </Label>
      {children}
    </div>
  );
}

function TextInput({ field, value, onChange, type = 'text', placeholder, autofilled, readOnly }) {
  return (
    <Input
      type={type}
      value={value || ''}
      onChange={e => !readOnly && onChange(field, e.target.value)}
      placeholder={placeholder || ''}
      readOnly={readOnly}
      className={`h-9 text-sm ${autofilled ? 'border-purple-300 bg-purple-50' : ''} ${readOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
    />
  );
}

function SelectInput({ field, value, onChange, options, placeholder }) {
  return (
    <Select value={value || ''} onValueChange={v => onChange(field, v)}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder || 'Select...'} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function AutoCalcDisplay({ label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
  };
  return (
    <div className="space-y-1">
      <Label className="text-xs flex items-center gap-1">
        <Calculator className="w-3 h-3" /> {label}
      </Label>
      <div className={`h-9 flex items-center px-3 border rounded-md text-sm font-bold ${colors[color]}`}>
        {value}
      </div>
    </div>
  );
}

function RemarkField({ formData, onChange }) {
  return (
    <div className="col-span-2 space-y-1">
      <Label className="text-xs">Remark</Label>
      <Textarea
        value={formData.remark || ''}
        onChange={e => onChange('remark', e.target.value)}
        placeholder="Add any remarks or additional details"
        rows={2}
        className="text-sm"
      />
    </div>
  );
}

// ─── TRAVEL FORMS ─────────────────────────────────────────────────
function TravelModeForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Mode of Transport" required>
        <SelectInput field="mode_type" value={formData.mode_type} onChange={onChange}
          placeholder="Select mode..."
          options={['Rail', 'Ola', 'Uber', 'Bus', 'Auto']} />
      </Field>
      <Field label="Travel Date" required>
        <TextInput field="travel_date" value={formData.travel_date} onChange={onChange} type="date" autofilled={autoFill('travel_date')} />
      </Field>
      <Field label="From" required>
        <TextInput field="from_location" value={formData.from_location} onChange={onChange} placeholder="Departure city / station" autofilled={autoFill('from_location')} />
      </Field>
      <Field label="To" required>
        <TextInput field="to_location" value={formData.to_location} onChange={onChange} placeholder="Arrival city / station" autofilled={autoFill('to_location')} />
      </Field>
      <Field label="Bill / Ticket / Ride ID">
        <TextInput field="bill_number" value={formData.bill_number} onChange={onChange} placeholder="Ticket number or Ride ID" autofilled={autoFill('bill_number')} />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
      <RemarkField formData={formData} onChange={onChange} />
    </div>
  );
}

function OwnVehicleForm({ formData, onChange }) {
  const vehicleType = formData.vehicle_type || '';
  const fuelType = formData.fuel_type || '';
  const fuelOptions = vehicleType === 'Bike' ? ['Petrol', 'EV'] : ['Petrol', 'Diesel', 'EV'];
  const rate = OWN_VEHICLE_RATES[vehicleType]?.[fuelType] || 0;

  useEffect(() => {
    const dist = parseFloat(formData.distance_km) || 0;
    const total = (rate * dist).toFixed(2);
    if (total !== formData.amount) onChange('amount', total);
  }, [vehicleType, fuelType, formData.distance_km]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Vehicle Type" required>
        <SelectInput field="vehicle_type" value={formData.vehicle_type} onChange={onChange}
          options={['Car', 'Bike']} />
      </Field>
      <Field label="Fuel Type" required>
        <SelectInput field="fuel_type" value={formData.fuel_type} onChange={onChange}
          options={fuelOptions} placeholder="Select fuel type..." />
      </Field>
      <Field label="Travel Date" required>
        <TextInput field="travel_date" value={formData.travel_date} onChange={onChange} type="date" />
      </Field>
      <Field label="From" required>
        <TextInput field="from_location" value={formData.from_location} onChange={onChange} placeholder="Start location" />
      </Field>
      <Field label="To" required>
        <TextInput field="to_location" value={formData.to_location} onChange={onChange} placeholder="End location" />
      </Field>
      <Field label="Distance (KM)" required>
        <TextInput field="distance_km" value={formData.distance_km} onChange={onChange} type="number" placeholder="0" />
      </Field>
      <AutoCalcDisplay label="Rate per KM (₹)" value={rate > 0 ? `₹${rate}/km` : '— select vehicle & fuel type'} color="blue" />
      <AutoCalcDisplay label="Auto-Calculated Amount (₹)" value={`₹${formData.amount || '0.00'}`} color="green" />
      <RemarkField formData={formData} onChange={onChange} />
    </div>
  );
}

function AirTravelForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Airline / Operator">
        <TextInput field="airline" value={formData.airline} onChange={onChange} placeholder="IndiGo, Air India..." />
      </Field>
      <Field label="Travel Date" required>
        <TextInput field="travel_date" value={formData.travel_date} onChange={onChange} type="date" autofilled={autoFill('travel_date')} />
      </Field>
      <Field label="From (City / Airport)" required>
        <TextInput field="from_location" value={formData.from_location} onChange={onChange} placeholder="e.g. BOM, DEL" autofilled={autoFill('from_location')} />
      </Field>
      <Field label="To (City / Airport)" required>
        <TextInput field="to_location" value={formData.to_location} onChange={onChange} placeholder="e.g. BOM, DEL" autofilled={autoFill('to_location')} />
      </Field>
      <Field label="PNR / Booking ID">
        <TextInput field="bill_number" value={formData.bill_number} onChange={onChange} placeholder="PNR number" autofilled={autoFill('bill_number')} />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
      <RemarkField formData={formData} onChange={onChange} />
    </div>
  );
}

// ─── FOOD FORMS ───────────────────────────────────────────────────
const MEAL_TYPE_OPTIONS = ['Lunch/Dinner', 'Refreshment', 'Food During Travel'];

function IndividualMealForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Meal Type" required>
        <SelectInput field="meal_type" value={formData.meal_type} onChange={onChange}
          placeholder="Select meal type..."
          options={MEAL_TYPE_OPTIONS} />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Location (City / Area)">
        <TextInput field="location" value={formData.location} onChange={onChange} placeholder="City or area" />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
    </div>
  );
}

function ExternalClientMealForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Meal Type" required>
        <SelectInput field="meal_type" value={formData.meal_type} onChange={onChange}
          placeholder="Select meal type..."
          options={MEAL_TYPE_OPTIONS} />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Client Name" required>
        <TextInput field="client_name" value={formData.client_name} onChange={onChange} placeholder="Name of client or company" />
      </Field>
      <Field label="Purpose" required>
        <TextInput field="purpose" value={formData.purpose} onChange={onChange} placeholder="e.g. Business meeting, product discussion" />
      </Field>
      <Field label="No. of People" required>
        <TextInput field="no_of_people" value={formData.no_of_people} onChange={onChange} type="number" placeholder="Total number of people" />
      </Field>
      <Field label="Restaurant Name">
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Name of the restaurant or venue" autofilled={autoFill('vendor_name')} />
      </Field>
      <Field label="Location (City / Area)">
        <TextInput field="location" value={formData.location} onChange={onChange} placeholder="City or area" />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
    </div>
  );
}

function TeamLunchForm({ formData, onChange, autoFill }) {
  const numEmployees = parseInt(formData.no_of_employees) || 0;

  const updateEmployee = (idx, field, val) => {
    const employees = Array.isArray(formData.employees) ? [...formData.employees] : [];
    if (!employees[idx]) employees[idx] = { code: '', name: '' };
    employees[idx] = { ...employees[idx], [field]: val };
    onChange('employees', employees);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Meal Type" required>
        <SelectInput field="meal_type" value={formData.meal_type} onChange={onChange}
          placeholder="Select meal type..."
          options={MEAL_TYPE_OPTIONS} />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Team Name / Employee Code" required>
        <TextInput field="team_name" value={formData.team_name} onChange={onChange} placeholder="Team name or your employee code" />
      </Field>
      <Field label="No. of Employees" required>
        <TextInput field="no_of_employees" value={formData.no_of_employees} onChange={onChange} type="number" placeholder="How many employees attended" />
      </Field>
      <Field label="Venue / Restaurant">
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Name of venue or restaurant" autofilled={autoFill('vendor_name')} />
      </Field>
      <Field label="Location (City / Area)">
        <TextInput field="location" value={formData.location} onChange={onChange} placeholder="City or area" />
      </Field>
      {numEmployees > 0 && (
        <div className="col-span-2">
          <Label className="text-xs mb-2 block">Employee Details ({numEmployees} members) <span className="text-red-500">*</span></Label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {Array.from({ length: numEmployees }).map((_, idx) => {
              const emp = (formData.employees || [])[idx] || {};
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{idx + 1}.</span>
                  <Input value={emp.code || ''} onChange={e => updateEmployee(idx, 'code', e.target.value)}
                    placeholder="Employee Code" className="h-8 text-sm flex-1" />
                  <Input value={emp.name || ''} onChange={e => updateEmployee(idx, 'name', e.target.value)}
                    placeholder="Employee Name" className="h-8 text-sm flex-1" />
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Field label="Total Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
    </div>
  );
}

// ─── HOTEL FORM ───────────────────────────────────────────────────
function HotelForm({ formData, onChange, autoFill }) {
  useEffect(() => {
    if (formData.check_in && formData.check_out) {
      const d1 = new Date(formData.check_in);
      const d2 = new Date(formData.check_out);
      const nights = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
      if (nights !== parseInt(formData.nights)) onChange('nights', String(nights));
    }
  }, [formData.check_in, formData.check_out]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Hotel Name" required>
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Hotel name" autofilled={autoFill('vendor_name')} />
      </Field>
      <Field label="City" required>
        <TextInput field="location" value={formData.location} onChange={onChange} placeholder="City" />
      </Field>
      <Field label="Check-in Date" required>
        <TextInput field="check_in" value={formData.check_in} onChange={onChange} type="date" autofilled={autoFill('check_in')} />
      </Field>
      <Field label="Check-out Date" required>
        <TextInput field="check_out" value={formData.check_out} onChange={onChange} type="date" autofilled={autoFill('check_out')} />
      </Field>
      <AutoCalcDisplay label="Nights (Auto)" value={`${formData.nights || '0'} night(s)`} color="blue" />
      <Field label="Booking ID">
        <TextInput field="bill_number" value={formData.bill_number} onChange={onChange} placeholder="Booking reference" autofilled={autoFill('bill_number')} />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Reason for Claim <span className="text-red-500">*</span></Label>
        <Textarea
          value={formData.note || ''}
          onChange={e => onChange('note', e.target.value)}
          placeholder="Please explain the reason for this hotel stay claim"
          rows={2}
          className="text-sm"
        />
      </div>
    </div>
  );
}

// ─── OFFICE EXPENSES FORM ─────────────────────────────────────────
function OfficeExpenseForm({ formData, onChange, autoFill, subType, isInternational }) {
  const subTypeOptions = isInternational
    ? ['Printing & Stationery', 'Courier', 'Mobile Bills', 'Repairs', 'Purchases', 'Other']
    : ['Printing & Stationery', 'Courier', 'Repairs', 'Purchases', 'Other'];

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Expense Sub-Type" required>
        <SelectInput field="office_expense_type" value={formData.office_expense_type || subType} onChange={onChange}
          options={subTypeOptions} />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Vendor / Supplier Name" required>
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Vendor / Supplier" autofilled={autoFill('vendor_name')} />
      </Field>
      <Field label="Invoice / Bill Number">
        <TextInput field="bill_number" value={formData.bill_number} onChange={onChange} placeholder="Invoice number" autofilled={autoFill('bill_number')} />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Description</Label>
        <Textarea value={formData.purpose || ''} onChange={e => onChange('purpose', e.target.value)}
          placeholder="Description / purpose" rows={2} className="text-sm" />
      </div>
    </div>
  );
}

// ─── TORCH BEARER FORMS ───────────────────────────────────────────
function TorchFuelForm({ formData, onChange, autoFill }) {
  const vehicleType = formData.torch_vehicle_type || '';
  const fuelType = formData.fuel_type || '';
  const fuelOptions = vehicleType === 'Bike' ? ['Petrol', 'EV'] : ['Petrol', 'Diesel', 'EV'];

  const kmRate = OWN_VEHICLE_RATES[vehicleType]?.[fuelType] || 0;

  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate_per_liter) || 0;
    const total = (qty * rate).toFixed(2);
    if (total !== formData.amount) onChange('amount', total);
  }, [formData.quantity, formData.rate_per_liter]);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* KM-based section */}
      <Field label="Vehicle Type" required>
        <SelectInput field="torch_vehicle_type" value={formData.torch_vehicle_type} onChange={onChange}
          options={['Car', 'Bike']} placeholder="Select vehicle..." />
      </Field>
      <Field label="Fuel Type (for KM rate)" required>
        <SelectInput field="fuel_type" value={formData.fuel_type} onChange={onChange}
          options={fuelOptions} placeholder="Select fuel type..." />
      </Field>
      <Field label="From Location">
        <TextInput field="from_location" value={formData.from_location} onChange={onChange} placeholder="Start location" />
      </Field>
      <Field label="To Location">
        <TextInput field="to_location" value={formData.to_location} onChange={onChange} placeholder="End location" />
      </Field>
      <Field label="Distance (KM)">
        <TextInput field="distance_km" value={formData.distance_km} onChange={onChange} type="number" placeholder="0" />
      </Field>
      <AutoCalcDisplay label="Rate per KM (₹)" value={kmRate > 0 ? `₹${kmRate}/km` : '— select vehicle & fuel'} color="blue" />

      {/* Fuel fill section */}
      <Field label="Vehicle Number" required>
        <TextInput field="vehicle_number" value={formData.vehicle_number} onChange={onChange} placeholder="MH01AB1234" />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Quantity (Liters)" required>
        <TextInput field="quantity" value={formData.quantity} onChange={onChange} type="number" placeholder="0" />
      </Field>
      <Field label="Rate per Liter (₹)" required>
        <TextInput field="rate_per_liter" value={formData.rate_per_liter} onChange={onChange} type="number" placeholder="0.00" />
      </Field>
      <div className="col-span-2">
        <AutoCalcDisplay label="Total Amount (₹)" value={`₹${formData.amount || '0.00'}`} color="green" />
      </div>
    </div>
  );
}

function GymForm({ formData, onChange, autoFill }) {
  useEffect(() => {
    if (formData.gym_start && formData.gym_end) {
      const d1 = new Date(formData.gym_start);
      const d2 = new Date(formData.gym_end);
      const months = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30)));
      if (months !== parseInt(formData.duration_months)) onChange('duration_months', String(months));
    }
  }, [formData.gym_start, formData.gym_end]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Membership Type" required>
        <SelectInput field="membership_type" value={formData.membership_type} onChange={onChange}
          options={['Monthly', 'Quarterly', 'Half-Yearly', 'Annual']} />
      </Field>
      <Field label="Gym / Fitness Center Name">
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Gym name" autofilled={autoFill('vendor_name')} />
      </Field>
      <Field label="Start Date" required>
        <TextInput field="gym_start" value={formData.gym_start} onChange={onChange} type="date" />
      </Field>
      <Field label="End Date" required>
        <TextInput field="gym_end" value={formData.gym_end} onChange={onChange} type="date" />
      </Field>
      <AutoCalcDisplay label="Duration (Months)" value={`${formData.duration_months || '0'} month(s)`} color="blue" />
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
    </div>
  );
}

// ─── SALES PROMOTION FORM ─────────────────────────────────────────
function SalesPromotionForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Promotion Type" required>
        <SelectInput field="promo_type" value={formData.promo_type} onChange={onChange}
          options={['Gift', 'Liquor']} placeholder="Select type..." />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Client Name" required>
        <TextInput field="client_name" value={formData.client_name} onChange={onChange} placeholder="Client / Company" />
      </Field>
      <Field label="Purpose" required>
        <TextInput field="purpose" value={formData.purpose} onChange={onChange} placeholder="Business purpose" />
      </Field>
      <Field label="Vendor / Location" required>
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Vendor or venue" autofilled={autoFill('vendor_name')} />
      </Field>
      <Field label="Invoice / Bill Number">
        <TextInput field="bill_number" value={formData.bill_number} onChange={onChange} placeholder="Invoice number" autofilled={autoFill('bill_number')} />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
    </div>
  );
}

function DefaultForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Vendor / Supplier Name" required>
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Vendor name" autofilled={autoFill('vendor_name')} />
      </Field>
      <Field label="Expense Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Bill / Invoice Number">
        <TextInput field="bill_number" value={formData.bill_number} onChange={onChange} placeholder="Invoice number" autofilled={autoFill('bill_number')} />
      </Field>
      <Field label="Amount (₹)" required>
        <TextInput field="amount" value={formData.amount} onChange={onChange} type="number" placeholder="0.00" autofilled={autoFill('amount')} />
      </Field>
      <div className="col-span-2 space-y-1">
        <Label className="text-xs">Purpose / Description <span className="text-red-500">*</span></Label>
        <Textarea value={formData.purpose || ''} onChange={e => onChange('purpose', e.target.value)}
          placeholder="Describe the expense" rows={2} className="text-sm" />
      </div>
    </div>
  );
}

// ─── TRAVEL SUBCATEGORY WRAPPER ───────────────────────────────────
function TravelForm({ formData, onChange, autoFill }) {
  const subType = formData.travel_sub_type || '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Travel Sub-Category" required>
            <SelectInput
              field="travel_sub_type"
              value={subType}
              onChange={onChange}
              placeholder="Select sub-category..."
              options={['Mode-Based Travel', 'Own Vehicle']}
            />
          </Field>
        </div>
      </div>
      {subType === 'Mode-Based Travel' && (
        <TravelModeForm formData={formData} onChange={onChange} autoFill={autoFill} />
      )}
      {subType === 'Own Vehicle' && (
        <OwnVehicleForm formData={formData} onChange={onChange} />
      )}
    </div>
  );
}

// ─── FOOD SUBCATEGORY WRAPPER ─────────────────────────────────────
function FoodForm({ formData, onChange, autoFill }) {
  const subType = formData.food_sub_type || '';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Food Sub-Category" required>
            <SelectInput
              field="food_sub_type"
              value={subType}
              onChange={onChange}
              placeholder="Select sub-category..."
              options={['Individual', 'Team Meet', 'Client Meet']}
            />
          </Field>
        </div>
      </div>
      {subType === 'Individual' && (
        <IndividualMealForm formData={formData} onChange={onChange} autoFill={autoFill} />
      )}
      {subType === 'Team Meet' && (
        <TeamLunchForm formData={formData} onChange={onChange} autoFill={autoFill} />
      )}
      {subType === 'Client Meet' && (
        <ExternalClientMealForm formData={formData} onChange={onChange} autoFill={autoFill} />
      )}
    </div>
  );
}

// ─── FORM SELECTOR ────────────────────────────────────────────────
function selectForm(headName, subTitle, formData, onChange, autoFill, category) {
  const h = (headName || '').toLowerCase();
  const s = (subTitle || '').toLowerCase();
  const isInternational = (category?.claim_type || '').toLowerCase() === 'international';

  if (h.includes('travel')) {
    if (s.includes('air') || s.includes('flight')) return <AirTravelForm formData={formData} onChange={onChange} autoFill={autoFill} />;
    return <TravelForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('food')) {
    return <FoodForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('hotel') || s.includes('hotel') || s.includes('accommodation')) {
    return <HotelForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('office') || h.includes('misc')) {
    return <OfficeExpenseForm formData={formData} onChange={onChange} autoFill={autoFill} subType={subTitle} isInternational={isInternational} />;
  }

  if (h.includes('torch')) {
    if (s.includes('gym')) return <GymForm formData={formData} onChange={onChange} autoFill={autoFill} />;
    if (s.includes('fuel')) return <TorchFuelForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('sales') || h.includes('promotion')) {
    return <SalesPromotionForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  return <DefaultForm formData={formData} onChange={onChange} autoFill={autoFill} />;
}

// ─── SECTION TITLE HELPER ─────────────────────────────────────────
function getSectionTitle(headName, subTitle) {
  const h = (headName || '').toLowerCase();
  const s = (subTitle || '').toLowerCase();
  if (h.includes('hotel') || s.includes('accommodation')) {
    return 'Hotel Accommodation — Hotel Stay';
  }
  if (h.includes('misc')) {
    return headName.replace(/misc/gi, 'Office Expenses');
  }
  return `${headName} — ${subTitle}`;
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────
export default function ClaimDynamicForm({ category, headName, formData, onChange, documents }) {
  const autofillSource = documents?.[0]?.extractedData || {};

  const handleChange = (key, val) => onChange({ ...formData, [key]: val });

  useEffect(() => {
    if (!autofillSource || Object.keys(autofillSource).length === 0) return;
    const patch = {};
    const map = {
      vendor_name: autofillSource.vendorName,
      amount: autofillSource.totalAmount ? String(autofillSource.totalAmount) : undefined,
      expense_date: autofillSource.billDate,
      travel_date: autofillSource.billDate,
      check_in: autofillSource.checkIn,
      check_out: autofillSource.checkOut,
      bill_number: autofillSource.billNumber,
      from_location: autofillSource.from,
      to_location: autofillSource.to,
      purpose: autofillSource.purpose,
    };
    Object.entries(map).forEach(([key, val]) => {
      if (val && !formData[key]) patch[key] = val;
    });
    if (Object.keys(patch).length > 0) onChange({ ...formData, ...patch });
  }, [documents?.[0]?.extractedData]);

  const autoFill = (key) => {
    const map = {
      vendor_name: autofillSource.vendorName,
      amount: autofillSource.totalAmount,
      expense_date: autofillSource.billDate,
      travel_date: autofillSource.billDate,
      check_in: autofillSource.checkIn,
      check_out: autofillSource.checkOut,
      bill_number: autofillSource.billNumber,
      from_location: autofillSource.from,
      to_location: autofillSource.to,
    };
    return !!map[key] && formData[key] == map[key];
  };

  const displayTitle = getSectionTitle(headName, category?.title);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-base">{displayTitle}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Fill in the expense details below</p>
        </div>
        {category?.policy_limit && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Policy Limit</p>
            <p className="text-sm font-bold text-amber-600">₹{category.policy_limit.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      {selectForm(headName, category?.title, formData, handleChange, autoFill, category)}
    </div>
  );
}