// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Document Request", {
	refresh(frm) {
		if (frm.doc.public_url) {
			frm.add_custom_button(__("Copy Customer Link"), () => {
				instacertify_crm.copy_text(frm.doc.public_url);
			}).addClass("btn-primary");
		}
		if (!frm.is_new()) {
			frm.add_custom_button(__("Ask for missing / extra docs"), () => {
				frappe.prompt(
					{
						fieldname: "team_remark",
						label: __("What is missing or extra?"),
						fieldtype: "Small Text",
						reqd: 1,
					},
					(values) => {
						frm.set_value({
							team_remark: values.team_remark,
							status: "Needs More",
						});
						frm.save();
					},
					__("Notify customer"),
				);
			});
		}
	},
});
