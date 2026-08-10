// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Project Task", {
	refresh(frm) {
		frm.toggle_display(
			["waiting_for", "waiting_expected_on", "waiting_note"],
			frm.doc.status === "Waiting",
		);
		if (!frm.is_new() && frm.doc.project) {
			frm.add_custom_button(__("Open Project"), () => {
				frappe.set_route("Form", "IC Customer Project", frm.doc.project);
			});
		}
	},
	status(frm) {
		frm.toggle_display(
			["waiting_for", "waiting_expected_on", "waiting_note"],
			frm.doc.status === "Waiting",
		);
	},
});
