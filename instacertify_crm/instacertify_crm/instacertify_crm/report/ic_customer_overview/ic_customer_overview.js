// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.query_reports["IC Customer Overview"] = {
	filters: [
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: ["", "Active", "Inactive"],
			default: "Active",
		},
	],
};
