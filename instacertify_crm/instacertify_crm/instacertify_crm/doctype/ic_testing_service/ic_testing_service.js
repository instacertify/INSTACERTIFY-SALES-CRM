// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Testing Service", {
	refresh(frm) {
		const is_admin =
			frappe.user.has_role("IC Admin") || frappe.user.has_role("System Manager");
		frm.set_df_property("purchase_price", "hidden", is_admin ? 0 : 1);
		frm.set_df_property("purchase_price", "read_only", is_admin ? 0 : 1);
	},
});
