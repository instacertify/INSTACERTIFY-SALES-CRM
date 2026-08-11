// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.query_reports["IC Lead Cost Spend"] = {
	filters: [
		{
			fieldname: "group_by",
			label: __("Group By"),
			fieldtype: "Select",
			options: ["Lead Source", "Assigned To", "Status", "Month"],
			default: "Lead Source",
			reqd: 1,
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -12),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today(),
		},
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: ["", "NEW", "CONTACTED", "FOLLOW_UP", "QUOTE_SENT", "WON", "LOST"],
		},
		{
			fieldname: "lead_source",
			label: __("Lead Source"),
			fieldtype: "Link",
			options: "IC Lead Source",
		},
	],
};
