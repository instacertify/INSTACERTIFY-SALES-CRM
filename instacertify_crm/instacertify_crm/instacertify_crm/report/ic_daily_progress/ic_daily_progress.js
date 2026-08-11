// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.query_reports["IC Daily Progress"] = {
	filters: [
		{
			fieldname: "days",
			label: __("Days"),
			fieldtype: "Select",
			options: ["7", "14", "30", "60"],
			default: "14",
			reqd: 1,
		},
	],
};
