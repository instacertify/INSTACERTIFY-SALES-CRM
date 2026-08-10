// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Quote Template", {
	refresh(frm) {
		const is_admin =
			frappe.user.has_role("IC Admin") || frappe.user.has_role("System Manager");
		frm.set_df_property("bank_detail", "read_only", is_admin ? 0 : 1);
		if (!is_admin) {
			frm.set_df_property(
				"bank_detail",
				"description",
				__("Bank details on templates can only be edited by IC Admin"),
			);
		}
	},
});
