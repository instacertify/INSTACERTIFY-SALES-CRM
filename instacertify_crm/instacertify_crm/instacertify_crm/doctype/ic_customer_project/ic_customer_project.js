// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Customer Project", {
	refresh(frm) {
		if (frm.is_new()) return;

		frm
			.add_custom_button(__("Log Delivery / Shared Record"), () => {
				frappe.new_doc("IC Delivery Record", {
					project: frm.doc.name,
					lead: frm.doc.lead,
					quote: frm.doc.primary_quote,
					service: frm.doc.service,
					customer_name: frm.doc.customer_name,
					company: frm.doc.company,
					email: frm.doc.email,
					direction: "To Customer",
					delivery_type: "Service Delivered",
				});
			})
			.addClass("btn-primary");

		frm.add_custom_button(__("Log Customer Data Received"), () => {
			frappe.new_doc("IC Delivery Record", {
				project: frm.doc.name,
				lead: frm.doc.lead,
				quote: frm.doc.primary_quote,
				service: frm.doc.service,
				customer_name: frm.doc.customer_name,
				company: frm.doc.company,
				email: frm.doc.email,
				direction: "From Customer",
				delivery_type: "Customer Data Received",
			});
		});

		frm.add_custom_button(__("Customer Lifecycle"), () => {
			instacertify_crm.show_customer_lifecycle({
				project: frm.doc.name,
				lead: frm.doc.lead,
			});
		});

		if (frm.doc.lead) {
			frm.add_custom_button(__("Open Lead"), () => {
				frappe.set_route("Form", "IC Lead", frm.doc.lead);
			});
		}
		if (frm.doc.primary_quote) {
			frm.add_custom_button(__("Open Quote"), () => {
				frappe.set_route("Form", "IC Quote", frm.doc.primary_quote);
			});
		}

		load_lifecycle(frm);
	},

	lead(frm) {
		if (!frm.doc.lead) return;
		frappe.db.get_doc("IC Lead", frm.doc.lead).then((l) => {
			frm.set_value({
				customer_name: l.customer_name,
				company: l.company,
				email: l.email,
				phone: l.phone,
				country: l.country,
				state: l.state,
				assigned_to: l.assigned_to,
				project_title: frm.doc.project_title || `${l.company} — ${l.customer_name}`,
			});
		});
	},
});

function load_lifecycle(frm) {
	frappe.call({
		method: "instacertify_crm.api.get_customer_lifecycle",
		args: { project: frm.doc.name, lead: frm.doc.lead },
		callback(r) {
			const html = instacertify_crm.render_customer_lifecycle(r.message || {});
			frm.dashboard.clear_headline();
			frm.dashboard.add_section(html, __("Customer lifecycle"));
		},
	});
}
