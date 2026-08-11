// Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
// For license information, please see license.txt

frappe.ui.form.on("IC Quote", {
	setup(frm) {
		frm.set_query("template", () => ({
			filters: {
				quote_type: frm.doc.quote_type || "Testing",
			},
		}));
	},

	refresh(frm) {
		toggle_quote_type(frm);
		if (!frm.is_new() && frm.doc.lead) {
			frm.add_custom_button(__("Customer History"), () => {
				instacertify_crm.show_customer_history({ lead: frm.doc.lead });
			});
			frm
				.add_custom_button(__("Customer Lifecycle"), () => {
					instacertify_crm.show_customer_lifecycle({
						lead: frm.doc.lead,
						quote: frm.doc.name,
					});
				})
				.addClass("btn-primary");
		}
		if (!frm.is_new()) {
			frm.add_custom_button(__("Open / Create Project"), () => {
				frappe.call({
					method: "instacertify_crm.api.ensure_customer_project",
					args: { quote: frm.doc.name, lead: frm.doc.lead },
					freeze: true,
					callback(r) {
						if (r.message?.name) {
							frappe.set_route("Form", "IC Customer Project", r.message.name);
						}
					},
				});
			});
			frm.add_custom_button(__("Log Delivery / Shared Record"), () => {
				frappe.new_doc("IC Delivery Record", {
					quote: frm.doc.name,
					lead: frm.doc.lead,
					service: frm.doc.service,
					customer_name: frm.doc.customer_name,
					company: frm.doc.company,
					email: frm.doc.email,
					direction: "To Customer",
					delivery_type: "Service Delivered",
				});
			});
		}
		if (!frm.is_new() && frm.doc.public_url) {
			frm.add_custom_button(__("Copy Customer Link"), () => {
				instacertify_crm.copy_text(frm.doc.public_url);
			});
		}
		if (!frm.is_new() && ["Draft", "Revision Requested"].includes(frm.doc.status)) {
			frm
				.add_custom_button(__("Share / Reshare Quote"), () => {
					frappe.call({
						method: "instacertify_crm.api.share_quote",
						args: { name: frm.doc.name },
						freeze: true,
						callback(r) {
							frm.reload_doc();
							if (r.message?.public_url) {
								frappe.msgprint({
									title: __("Quote shared"),
									message: __("Customer link: {0}", [r.message.public_url]),
									indicator: "green",
								});
							}
						},
					});
				})
				.addClass("btn-primary");
		}
		if (!frm.is_new() && ["Accepted", "Shared"].includes(frm.doc.status)) {
			frm.add_custom_button(__("Create Sample Request"), () => {
				frappe.new_doc("IC Sample Request", {
					quote: frm.doc.name,
					customer_name: frm.doc.customer_name,
					company: frm.doc.company,
					email: frm.doc.email,
					phone: frm.doc.phone,
					sample_label: `${frm.doc.service || frm.doc.subject || "Sample"} — ${frm.doc.company}`,
					status: "Awaiting Sample",
				});
			});
		}
		if (frm.doc.status === "Accepted") {
			frm
				.add_custom_button(__("Select Documents & Share"), () => {
					instacertify_crm.create_document_request_dialog(frm.doc);
				})
				.addClass("btn-primary");
			frm.add_custom_button(__("Upload Final Report"), () => {
				frappe.new_doc("IC Report", {
					quote: frm.doc.name,
					title: __("Final report — {0}", [frm.doc.name]),
					message: __("Your report for quote {0} is ready to download.", [frm.doc.name]),
				});
			});
			frm
				.add_custom_button(__("Mark Service Delivered"), () => {
					instacertify_crm.mark_service_delivered_dialog(frm.doc);
				})
				.addClass("btn-primary");
		}
	},

	quote_type(frm) {
		toggle_quote_type(frm);
		frm.set_value("template", "");
		if (frm.doc.quote_type === "Service" && frm.doc.about_header === "About") {
			frm.set_value("about_header", "About Service");
		}
		if (frm.doc.quote_type === "Testing" && frm.doc.about_header === "About Service") {
			frm.set_value("about_header", "About");
		}
		frm.set_query("template", () => ({
			filters: { quote_type: frm.doc.quote_type || "Testing" },
		}));
		recalc_all(frm);
	},

	template(frm) {
		if (!frm.doc.template) return;
		frappe.db.get_doc("IC Quote Template", frm.doc.template).then((t) => {
			const sectionFields = [
				"about_header",
				"about_html",
				"standards_header",
				"standards_html",
				"accreditation_html",
				"timeline_header",
				"timeline_html",
				"commercials_header",
				"payment_terms_header",
				"payment_terms_html",
				"banking_header",
				"sample_requirements_header",
				"sample_requirements_html",
				"sample_handling_header",
				"sample_handling_html",
				"cancellation_header",
				"cancellation_refund_html",
				"force_majeure_header",
				"force_majeure_html",
				"confidentiality_header",
				"confidentiality_html",
				"deliverables_header",
				"deliverables_html",
				"policies_html",
				"body_html",
			];
			const values = {
				quote_type: t.quote_type || frm.doc.quote_type,
				subject: t.subject,
				service: t.service,
				other_commercials: t.other_commercials,
				other_commercials_note: t.other_commercials_note,
				bank_detail: t.bank_detail,
			};
			sectionFields.forEach((field) => {
				if (t[field] !== undefined && t[field] !== null) values[field] = t[field];
			});
			if (t.subject && !frm.doc.description) {
				values.description = t.subject;
			}
			frm.set_value(values);
			if (t.validity_days && !frm.doc.validity_date) {
				frm.set_value(
					"validity_date",
					frappe.datetime.add_days(frappe.datetime.get_today(), t.validity_days),
				);
			}
		});
	},

	bank_detail(frm) {
		if (!frm.doc.bank_detail) return;
		frappe.db.get_doc("IC Bank Detail", frm.doc.bank_detail).then((b) => {
			const lines = [
				`Beneficiary Name: ${b.account_name}`,
				`Bank Name: ${b.bank_name}`,
				`Account Number: ${b.account_number}`,
				`IFSC Code: ${b.ifsc}`,
			];
			if (b.swift) lines.push(`SWIFT Code: ${b.swift}`);
			if (b.gstin) lines.push(`GSTIN: ${b.gstin}`);
			if (b.branch) lines.push(`Branch Address: ${b.branch}`);
			if (b.upi) lines.push(`UPI: ${b.upi}`);
			if (b.notes) lines.push(`Note: ${b.notes}`);
			frm.set_value("bank_snapshot", lines.join("\n"));
		});
	},

	other_commercials(frm) {
		recalc_all(frm);
	},
});

frappe.ui.form.on("IC Quote Testing Item", {
	testing_service(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.testing_service) return;
		frappe.db.get_doc("IC Testing Service", row.testing_service).then((t) => {
			frappe.model.set_value(cdt, cdn, {
				test_name: t.test_name,
				lab_name: t.lab_name,
				per_unit_charges: t.selling_price,
				units: row.units || 1,
				selling_price: (row.units || 1) * flt(t.selling_price),
			});
			recalc_all(frm);
		});
	},
	units(frm, cdt, cdn) {
		recalc_testing_row(cdt, cdn);
		recalc_all(frm);
	},
	per_unit_charges(frm, cdt, cdn) {
		recalc_testing_row(cdt, cdn);
		recalc_all(frm);
	},
	selling_price(frm) {
		recalc_all(frm);
	},
	testing_items_remove(frm) {
		recalc_all(frm);
	},
});

frappe.ui.form.on("IC Quote Consulting Item", {
	amount(frm) {
		recalc_all(frm);
	},
	consulting_items_remove(frm) {
		recalc_all(frm);
	},
});

frappe.ui.form.on("IC Quote Government Fee", {
	amount(frm) {
		recalc_all(frm);
	},
	government_fees_remove(frm) {
		recalc_all(frm);
	},
});

frappe.ui.form.on("IC Quote Service Testing Charge", {
	testing_service(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.testing_service) return;
		frappe.db.get_doc("IC Testing Service", row.testing_service).then((t) => {
			frappe.model.set_value(cdt, cdn, {
				charge_type: row.charge_type || t.test_name,
				description: row.description || t.description || t.lab_name,
				amount: t.selling_price,
			});
			recalc_all(frm);
		});
	},
	amount(frm) {
		recalc_all(frm);
	},
	service_testing_charges_remove(frm) {
		recalc_all(frm);
	},
});

function recalc_testing_row(cdt, cdn) {
	const row = locals[cdt][cdn];
	const units = flt(row.units) || 1;
	if (flt(row.per_unit_charges)) {
		frappe.model.set_value(cdt, cdn, "selling_price", units * flt(row.per_unit_charges));
	}
}

function recalc_all(frm) {
	if (frm.doc.quote_type === "Service") {
		const consulting = (frm.doc.consulting_items || []).reduce(
			(sum, row) => sum + flt(row.amount),
			0,
		);
		const gov = (frm.doc.government_fees || []).reduce((sum, row) => sum + flt(row.amount), 0);
		const testing = (frm.doc.service_testing_charges || []).reduce(
			(sum, row) => sum + flt(row.amount),
			0,
		);
		frm.set_value("consulting_price", consulting);
		frm.set_value("government_fees_total", gov);
		frm.set_value("testing_price", testing);
		frm.set_value(
			"total_revenue",
			consulting + gov + testing + flt(frm.doc.other_commercials),
		);
		return;
	}
	const testing = (frm.doc.testing_items || []).reduce(
		(sum, row) => sum + flt(row.selling_price),
		0,
	);
	frm.set_value("testing_price", testing);
	frm.set_value(
		"total_revenue",
		flt(frm.doc.consulting_price) + testing + flt(frm.doc.other_commercials),
	);
}

function toggle_quote_type(frm) {
	const testing = frm.doc.quote_type === "Testing";
	const service = frm.doc.quote_type === "Service";
	frm.toggle_display("testing_items", testing);
	frm.toggle_display("consulting_items", service);
	frm.toggle_display("government_fees", service);
	frm.toggle_display("service_testing_charges", service);
	frm.toggle_display("government_fees_total", service);
	frm.toggle_display("accreditation_html", service);
	if (testing) {
		frm.dashboard.set_headline_alert(
			__(
				"Testing quote: collapsible sections with customisable headers (About → Confidentiality).",
			),
			"blue",
		);
	} else if (service) {
		frm.dashboard.set_headline_alert(
			__(
				"Service quote: About Service → Standard → Timeline → Commercials (consulting / government fees / testing charges — add multiple rows) → Payment Terms → Banking → Samples → policies.",
			),
			"blue",
		);
	}
}
