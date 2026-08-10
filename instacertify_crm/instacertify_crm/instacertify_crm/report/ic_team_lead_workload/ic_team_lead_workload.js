// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.query_reports["IC Team Lead Workload"] = {
	filters: [
		{
			fieldname: "group_by",
			label: __("Group By"),
			fieldtype: "Select",
			options: ["Assigned To", "Owner"],
			default: "Assigned To",
			reqd: 1,
		},
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "Select",
			options: [
				"",
				"NEW",
				"CONTACTED",
				"FOLLOW_UP",
				"QUOTE_SENT",
				"WON",
				"LOST",
			],
		},
		{
			fieldname: "active_only",
			label: __("Active leads only"),
			fieldtype: "Check",
			default: 1,
			description: __("Exclude WON and LOST"),
		},
	],
};
