// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Employee Profile", {
	refresh(frm) {
		const isAdmin =
			frappe.user.has_role("IC Admin") || frappe.user.has_role("System Manager");
		if (isAdmin && frm.doc.status === "Pending Approval") {
			frm
				.add_custom_button(__("Approve profile"), () => {
					frm.set_value("status", "Active");
					frm.save();
				})
				.addClass("btn-primary");
		}
		if (!frm.is_new() && frm.doc.user === frappe.session.user) {
			frm.add_custom_button(__("My salary slips"), () => {
				frappe.set_route("List", "IC Salary Slip", { user: frappe.session.user });
			});
			frm.add_custom_button(__("My attendance"), () => {
				frappe.set_route("List", "IC Attendance", { user: frappe.session.user });
			});
			frm.add_custom_button(__("Holiday calendar"), () => {
				frappe.set_route("List", "IC Holiday");
			});
		}
	},
});
