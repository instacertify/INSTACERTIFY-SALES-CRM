// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Quote Template", {
	refresh(frm) {
		const is_admin =
			frappe.user.has_role("IC Admin") || frappe.user.has_role("System Manager");
		frm.toggle_display("accreditation_html", frm.doc.quote_type === "Service");

		// Anyone can create; only admin can edit existing templates.
		if (!frm.is_new() && !is_admin) {
			frm.set_read_only();
			frm.disable_save();
			frm.dashboard.set_headline_alert(
				__("Quote templates can be created by anyone. Only IC Admin can edit them."),
				"blue",
			);
		} else if (frm.is_new() && !is_admin) {
			frm.dashboard.set_headline_alert(
				__("You can create this template. After save, only IC Admin can edit it."),
				"blue",
			);
		}
	},
	quote_type(frm) {
		frm.toggle_display("accreditation_html", frm.doc.quote_type === "Service");
	},
});
