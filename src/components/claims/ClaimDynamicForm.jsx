import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Calculator } from 'lucide-react';

// ─── OWN VEHICLE RATES ────────────────────────────────────────────
const OWN_VEHICLE_RATES = {
  'Car - Petrol': 12,
  'Car - Diesel': 10,
  'Car - EV': 8,
  'Bike': 6,
  'Bike - EV': 3,
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

function TextInput({ field, value, onChange, type = 'text', placeholder, autofilled }) {
  return (
    <Input
      type={type}
      value={value || ''}
      onChange={e => onChange(field, e.target.value)}
      placeholder={placeholder || ''}
      className={`h-9 text-sm ${autofilled ? 'border-purple-300 bg-purple-50' : ''}`}
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

// ─── TRAVEL FORMS ─────────────────────────────────────────────────
function TravelModeForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}

function OwnVehicleForm({ formData, onChange }) {
  useEffect(() => {
    const rate = OWN_VEHICLE_RATES[formData.vehicle_type] || 0;
    const dist = parseFloat(formData.distance_km) || 0;
    const total = (rate * dist).toFixed(2);
    if (total !== formData.amount) onChange('amount', total);
  }, [formData.vehicle_type, formData.distance_km]);

  const rate = OWN_VEHICLE_RATES[formData.vehicle_type] || 0;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Vehicle Type" required>
        <SelectInput field="vehicle_type" value={formData.vehicle_type} onChange={onChange}
          options={Object.keys(OWN_VEHICLE_RATES)} />
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
      <AutoCalcDisplay label="Rate per KM (₹)" value={rate > 0 ? `₹${rate}/km` : '— select vehicle type'} color="blue" />
      <div className="col-span-2">
        <AutoCalcDisplay label="Auto-Calculated Amount (₹)" value={`₹${formData.amount || '0.00'}`} color="green" />
      </div>
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
    </div>
  );
}

// ─── FOOD FORMS ───────────────────────────────────────────────────
function IndividualMealForm({ formData, onChange, autoFill }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Meal Type" required>
        <SelectInput field="meal_type" value={formData.meal_type} onChange={onChange}
          placeholder="e.g. Lunch, Dinner..."
          options={['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Tea / Coffee']} />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Location (City / Area)">
        <TextInput field="location" value={formData.location} onChange={onChange} placeholder="City or area where you ate (optional)" />
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
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
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
      <Field label="Team Name / Employee Code" required>
        <TextInput field="team_name" value={formData.team_name} onChange={onChange} placeholder="Team name or your employee code" />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="No. of Employees" required>
        <TextInput field="no_of_employees" value={formData.no_of_employees} onChange={onChange} type="number" placeholder="How many employees attended" />
      </Field>
      <Field label="Venue / Restaurant">
        <TextInput field="vendor_name" value={formData.vendor_name} onChange={onChange} placeholder="Name of venue or restaurant" autofilled={autoFill('vendor_name')} />
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
    </div>
  );
}

// ─── OTHER FORMS ──────────────────────────────────────────────────
function OfficeExpenseForm({ formData, onChange, autoFill, subType }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Expense Sub-Type" required>
        <SelectInput field="office_expense_type" value={formData.office_expense_type || subType} onChange={onChange}
          options={['Printing & Stationery', 'Courier', 'Mobile Bills', 'Repairs', 'Purchases', 'Other']} />
      </Field>
      <Field label="Date" required>
        <TextInput field="expense_date" value={formData.expense_date} onChange={onChange} type="date" autofilled={autoFill('expense_date')} />
      </Field>
      <Field label="Vendor Name" required>
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

function TorchFuelForm({ formData, onChange, autoFill }) {
  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate_per_liter) || 0;
    const total = (qty * rate).toFixed(2);
    if (total !== formData.amount) onChange('amount', total);
  }, [formData.quantity, formData.rate_per_liter]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Vehicle Number" required>
        <TextInput field="vehicle_number" value={formData.vehicle_number} onChange={onChange} placeholder="MH01AB1234" />
      </Field>
      <Field label="Fuel Type" required>
        <SelectInput field="fuel_type" value={formData.fuel_type} onChange={onChange}
          options={['Petrol', 'Diesel', 'CNG', 'Electric']} />
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
      <AutoCalcDisplay label="Total Amount (₹)" value={`₹${formData.amount || '0.00'}`} color="green" />
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

function SalesPromotionForm({ formData, onChange, autoFill, subType }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Promotion Type" required>
        <SelectInput field="promo_type" value={formData.promo_type || subType} onChange={onChange}
          options={['Gift', 'Liquor', 'Stay', 'Lunch/Dinner', 'Entertainment', 'Other']} />
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

// ─── FORM SELECTOR ────────────────────────────────────────────────
function selectForm(headName, subTitle, formData, onChange, autoFill) {
  const h = (headName || '').toLowerCase();
  const s = (subTitle || '').toLowerCase();

  if (h.includes('travel')) {
    if (s.includes('own vehicle')) return <OwnVehicleForm formData={formData} onChange={onChange} />;
    if (s.includes('air') || s.includes('flight')) return <AirTravelForm formData={formData} onChange={onChange} autoFill={autoFill} />;
    return <TravelModeForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('food')) {
    if (s.includes('external') || s.includes('client')) return <ExternalClientMealForm formData={formData} onChange={onChange} autoFill={autoFill} />;
    if (s.includes('team') || s.includes('quarterly')) return <TeamLunchForm formData={formData} onChange={onChange} autoFill={autoFill} />;
    return <IndividualMealForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('hotel') || s.includes('hotel') || s.includes('accommodation')) {
    return <HotelForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('office')) {
    return <OfficeExpenseForm formData={formData} onChange={onChange} autoFill={autoFill} subType={subTitle} />;
  }

  if (h.includes('torch')) {
    if (s.includes('gym')) return <GymForm formData={formData} onChange={onChange} autoFill={autoFill} />;
    if (s.includes('fuel')) return <TorchFuelForm formData={formData} onChange={onChange} autoFill={autoFill} />;
  }

  if (h.includes('sales') || h.includes('promotion')) {
    return <SalesPromotionForm formData={formData} onChange={onChange} autoFill={autoFill} subType={subTitle} />;
  }

  return <DefaultForm formData={formData} onChange={onChange} autoFill={autoFill} />;
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────
export default function ClaimDynamicForm({ category, headName, formData, onChange, documents }) {
  const autofillSource = documents?.[0]?.extractedData || {};

  const handleChange = (key, val) => onChange({ ...formData, [key]: val });

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

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-xl border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900 text-base">{headName} — {category?.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">Fill in the expense details below</p>
        </div>
        {category?.policy_limit && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Policy Limit</p>
            <p className="text-sm font-bold text-amber-600">₹{category.policy_limit.toLocaleString('en-IN')}</p>
          </div>
        )}
      </div>

      {selectForm(headName, category?.title, formData, handleChange, autoFill)}

    </div>
  );
}