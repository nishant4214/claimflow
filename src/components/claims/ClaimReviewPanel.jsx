import React from 'react';
import { computeClaimTotals, formatAmount, getCurrencySymbol } from '@/lib/currency';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, ImageIcon, AlertTriangle, CreditCard, User, Calendar, Hash } from 'lucide-react';

function RowItem({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500 min-w-[140px]">{label}</span>
      <span className="text-xs font-medium text-gray-900 text-right ml-4">{value}</span>
    </div>
  );
}

function FormDataReview({ formData, headName, subTitle }) {
  const h = (headName || '').toLowerCase();
  const s = (subTitle || '').toLowerCase();

  const rows = [];

  // Travel
  if (h.includes('travel')) {
    if (s.includes('own vehicle')) {
      rows.push(['Vehicle Type', formData.vehicle_type]);
      rows.push(['Travel Date', formData.travel_date]);
      rows.push(['From', formData.from_location]);
      rows.push(['To', formData.to_location]);
      rows.push(['Distance (KM)', formData.distance_km]);
      rows.push(['Calculated Amount (₹)', formData.amount]);
    } else if (s.includes('air') || s.includes('flight')) {
      rows.push(['Airline', formData.airline]);
      rows.push(['Travel Date', formData.travel_date]);
      rows.push(['From', formData.from_location]);
      rows.push(['To', formData.to_location]);
      rows.push(['PNR / Booking ID', formData.bill_number]);
      rows.push(['Amount (₹)', formData.amount]);
    } else {
      rows.push(['Travel Date', formData.travel_date]);
      rows.push(['From', formData.from_location]);
      rows.push(['To', formData.to_location]);
      rows.push(['Ticket / Ride ID', formData.bill_number]);
      rows.push(['Amount (₹)', formData.amount]);
    }
  }
  // Food
  else if (h.includes('food')) {
    if (s.includes('external') || s.includes('client')) {
      rows.push(['Client Name', formData.client_name]);
      rows.push(['Purpose', formData.purpose]);
      rows.push(['No. of People', formData.no_of_people]);
      rows.push(['Restaurant', formData.vendor_name]);
      rows.push(['Date', formData.expense_date]);
      rows.push(['Amount (₹)', formData.amount]);
    } else if (s.includes('team') || s.includes('quarterly')) {
      rows.push(['Team Name', formData.team_name]);
      rows.push(['Date', formData.expense_date]);
      rows.push(['No. of Employees', formData.no_of_employees]);
      rows.push(['Venue', formData.vendor_name]);
      rows.push(['Total Amount (₹)', formData.amount]);
      if (Array.isArray(formData.employees) && formData.employees.length > 0) {
        rows.push(['Employees', formData.employees.map(e => `${e.code} - ${e.name}`).join(', ')]);
      }
    } else {
      rows.push(['Meal Type', formData.meal_type]);
      rows.push(['Date', formData.expense_date]);
      rows.push(['Location', formData.location]);
      rows.push(['Amount (₹)', formData.amount]);
    }
  }
  // Hotel
  else if (h.includes('hotel') || s.includes('hotel') || s.includes('accommodation')) {
    rows.push(['Hotel Name', formData.vendor_name]);
    rows.push(['City', formData.location]);
    rows.push(['Check-in', formData.check_in]);
    rows.push(['Check-out', formData.check_out]);
    rows.push(['Nights', formData.nights ? `${formData.nights} night(s)` : undefined]);
    rows.push(['Booking ID', formData.bill_number]);
    rows.push(['Amount (₹)', formData.amount]);
  }
  // Office
  else if (h.includes('office')) {
    rows.push(['Sub-Type', formData.office_expense_type]);
    rows.push(['Date', formData.expense_date]);
    rows.push(['Vendor', formData.vendor_name]);
    rows.push(['Invoice No.', formData.bill_number]);
    rows.push(['Amount (₹)', formData.amount]);
    rows.push(['Description', formData.purpose]);
  }
  // Torch — Fuel
  else if (h.includes('torch') && s.includes('fuel')) {
    rows.push(['Vehicle No.', formData.vehicle_number]);
    rows.push(['Fuel Type', formData.fuel_type]);
    rows.push(['Date', formData.expense_date]);
    rows.push(['Quantity (L)', formData.quantity]);
    rows.push(['Rate/Liter (₹)', formData.rate_per_liter]);
    rows.push(['Total Amount (₹)', formData.amount]);
  }
  // Torch — Gym
  else if (h.includes('torch') && s.includes('gym')) {
    rows.push(['Membership Type', formData.membership_type]);
    rows.push(['Gym Name', formData.vendor_name]);
    rows.push(['Start Date', formData.gym_start]);
    rows.push(['End Date', formData.gym_end]);
    rows.push(['Duration', formData.duration_months ? `${formData.duration_months} month(s)` : undefined]);
    rows.push(['Amount (₹)', formData.amount]);
  }
  // Sales Promotion
  else if (h.includes('sales') || h.includes('promotion')) {
    rows.push(['Promotion Type', formData.promo_type]);
    rows.push(['Date', formData.expense_date]);
    rows.push(['Client Name', formData.client_name]);
    rows.push(['Purpose', formData.purpose]);
    rows.push(['Vendor / Venue', formData.vendor_name]);
    rows.push(['Invoice No.', formData.bill_number]);
    rows.push(['Amount (₹)', formData.amount]);
  }
  // Default
  else {
    rows.push(['Vendor', formData.vendor_name]);
    rows.push(['Date', formData.expense_date]);
    rows.push(['Invoice No.', formData.bill_number]);
    rows.push(['Amount (₹)', formData.amount]);
    rows.push(['Purpose', formData.purpose]);
  }

  // Always show period if set
  if (formData.date_from) rows.push(['Period From', formData.date_from]);
  if (formData.date_to) rows.push(['Period To', formData.date_to]);

  return (
    <div className="divide-y divide-gray-50">
      {rows.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([label, value]) => (
        <RowItem key={label} label={label} value={String(value)} />
      ))}
    </div>
  );
}

function getEntryAmount(entry) {
  const bills = entry.documents.filter(d => d.uploadType === 'bill' && d.status === 'done');
  if (bills.length > 0) {
    const billTotal = bills.reduce((s, d) => s + (parseFloat(d.extractedData?.totalAmount) || 0), 0);
    if (billTotal > 0) return billTotal;
  }
  return parseFloat(entry.formData?.amount) || 0;
}

export default function ClaimReviewPanel({ entries, paymentDetails, user }) {
  const totalAll = entries.reduce((sum, e) => sum + getEntryAmount(e), 0);
  const currencyTotals = computeClaimTotals(entries);
  const isMultiCurrency = currencyTotals.length > 1;

  const totalDocs = entries.reduce((sum, e) => sum + e.documents.length, 0);
  const hasWarnings = entries.some(e => e.documents.some(d => d.validation?.flags?.length > 0));

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 p-8">
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-blue-100 text-sm mb-1">Expense Claim Summary</p>
            {isMultiCurrency ? (
            <div className="space-y-1">
              {currencyTotals.map(({ currency, total }) => (
                <p key={currency} className="text-2xl font-bold">{formatAmount(total, currency)}</p>
              ))}
            </div>
          ) : (
            <p className="text-3xl font-bold">{formatAmount(totalAll, currencyTotals[0]?.currency || 'INR')}</p>
          )}
            <p className="text-blue-200 text-sm mt-2">{entries.length} categor{entries.length === 1 ? 'y' : 'ies'} · {totalDocs} document{totalDocs !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-blue-100 text-sm mb-1">
              <User className="w-3.5 h-3.5" /> {user?.full_name}
            </div>
            <div className="text-blue-200 text-xs">{user?.email}</div>
            <div className="text-blue-200 text-xs mt-1">{user?.department}</div>
          </div>
        </div>
        {hasWarnings && (
          <div className="mt-3 bg-amber-500/20 border border-amber-300/40 rounded-lg px-3 py-2 flex items-center gap-2 text-amber-200 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Some documents have validation warnings. Please review before submitting.
          </div>
        )}
      </div>

      {/* Per-category entries */}
      {entries.map((entry, idx) => {
        const entryAmount = getEntryAmount(entry);
        return (
          <div key={idx} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{idx + 1}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{entry.head} — {entry.subHead?.title}</p>
                  <p className="text-xs text-gray-500">{entry.subHead?.description || (entry.subHead?.is_sales_promotion ? 'Sales Promotion' : 'Normal Claim')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatAmount(entryAmount, entry.documents?.[0]?.extractedData?.currency || 'INR')}</p>
                {entry.subHead?.policy_limit && (
                  <p className={`text-xs ${entryAmount > entry.subHead.policy_limit ? 'text-red-600' : 'text-green-600'}`}>
                    Limit: ₹{entry.subHead.policy_limit.toLocaleString('en-IN')}
                    {entryAmount > entry.subHead.policy_limit ? ' ⚠ Exceeded' : ' ✓'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Expense Details */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Expense Details
                </p>
                <FormDataReview formData={entry.formData} headName={entry.head} subTitle={entry.subHead?.title} />
              </div>

              {/* Uploaded Documents */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Uploaded Documents ({entry.documents.length})
                </p>
                {entry.documents.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No documents uploaded for this category.</p>
                ) : (
                  <div className="space-y-2">
                    {entry.documents.map((doc, dIdx) => {
                      const flags = doc.validation?.flags || [];
                      const score = doc.validation?.authenticityScore;
                      return (
                        <div key={dIdx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                          {doc.fileUrl ? (
                            <img src={doc.fileUrl} alt="" className="w-10 h-10 rounded object-cover border flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {doc.extractedData?.vendorName || doc.fileName || `Document ${dIdx + 1}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {doc.extractedData?.totalAmount && (
                                <span className="text-xs text-gray-500">₹{doc.extractedData.totalAmount}</span>
                              )}
                              {doc.extractedData?.billDate && (
                                <span className="text-xs text-gray-400">{doc.extractedData.billDate}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {score !== undefined && (
                              <Badge className={`text-[10px] px-1.5 py-0 ${score >= 80 ? 'bg-green-100 text-green-700 border-green-200' : score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                {score}% valid
                              </Badge>
                            )}
                            {flags.length > 0 && (
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Payment Details */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Payment Details
        </p>
        <div className="grid grid-cols-2 gap-x-8">
          <RowItem label="Payment Mode" value={paymentDetails.payment_mode} />
          <RowItem label="Reference Number" value={paymentDetails.reference_number} />
          <RowItem label="Payment Date" value={paymentDetails.payment_date} />
          <RowItem label="Remarks" value={paymentDetails.remarks} />
        </div>
      </div>

      {/* Grand Total */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium">Grand Total Claim Amount</p>
            <p className="text-xs text-blue-500">{entries.length} categor{entries.length === 1 ? 'y' : 'ies'} · {totalDocs} document{totalDocs !== 1 ? 's' : ''}</p>
          </div>
          {isMultiCurrency ? (
            <div className="text-right space-y-1">
              {currencyTotals.map(({ currency, total }) => (
                <p key={currency} className="text-xl font-bold text-blue-800">{formatAmount(total, currency)}</p>
              ))}
            </div>
          ) : (
            <p className="text-2xl font-bold text-blue-800">{formatAmount(totalAll, currencyTotals[0]?.currency || 'INR')}</p>
          )}
        </div>
        {isMultiCurrency && (
          <div className="mt-3 bg-blue-100 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            ⚠️ This claim contains multiple currencies. Totals are shown separately per currency and will not be combined.
          </div>
        )}
      </div>
    </div>
  );
}