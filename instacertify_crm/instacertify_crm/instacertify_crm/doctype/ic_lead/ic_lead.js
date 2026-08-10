// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Lead", {
	refresh(frm) {
		toggle_state(frm);
		if (!frm.is_new()) {
			frm.add_custom_button(__("Create Quote"), () => {
				frappe.new_doc("IC Quote", {
					lead: frm.doc.name,
					customer_name: frm.doc.customer_name,
					company: frm.doc.company,
					email: frm.doc.email,
					phone: frm.doc.phone,
					country: frm.doc.country,
					state: frm.doc.state,
				});
			}).addClass("btn-primary");
		}
	},
	country(frm) {
		toggle_state(frm);
	},
});

function toggle_state(frm) {
	const india = frm.doc.country === "India";
	frm.toggle_reqd("state", india);
	frm.set_df_property(
		"state",
		"description",
		india
			? "Select / enter Indian state (required)"
			: "Optional state / region",
	);
}
