// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Testing Service", {
	refresh(frm) {
		const is_admin =
			frappe.user.has_role("IC Admin") || frappe.user.has_role("System Manager");
		frm.set_df_property("purchase_price", "hidden", is_admin ? 0 : 1);
		frm.set_df_property("purchase_price", "read_only", is_admin ? 0 : 1);
		frm.set_query("lab", () => ({ filters: { active: 1 } }));
		if (frm.doc.lab) {
			frm.add_custom_button(__("Open Lab Profile"), () => {
				frappe.set_route("Form", "IC Lab", frm.doc.lab);
			});
		}
	},
	lab(frm) {
		if (!frm.doc.lab) {
			frm.set_value({
				lab_name: "",
				lab_city: "",
				lab_contact: "",
				lab_phone: "",
			});
			return;
		}
		frappe.db.get_doc("IC Lab", frm.doc.lab).then((lab) => {
			frm.set_value({
				lab_name: lab.lab_name,
				lab_city: lab.city,
				lab_contact: lab.primary_contact,
				lab_phone: lab.primary_phone,
			});
		});
	},
});
