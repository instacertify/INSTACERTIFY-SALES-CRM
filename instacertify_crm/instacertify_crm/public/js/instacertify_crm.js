// Instacertify CRM desk helpers for ERPNext 16
frappe.provide("instacertify_crm");

instacertify_crm.copy_text = async function (text) {
	await navigator.clipboard.writeText(text);
	frappe.show_alert({ message: __("Copied"), indicator: "green" });
};

instacertify_crm.render_customer_history = function (data) {
	const quotes = data.quotes || [];
	if (!quotes.length) {
		return `<div class="text-muted">${__("No past quotes, testing or reports for this customer yet.")}</div>`;
	}
	const rows = quotes
		.map((q) => {
			const tests = (q.testing_items || [])
				.map(
					(t) =>
						`<li>${frappe.utils.escape_html(t.applicable_standard || "")} ${frappe.utils.escape_html(
							t.test_name || "",
						)} — ${format_currency(t.selling_price)}</li>`,
				)
				.join("");
			const reports = (q.reports || [])
				.map(
					(r) =>
						`<li><a href="/app/ic-report/${encodeURIComponent(r.name)}">${frappe.utils.escape_html(
							r.title || r.name,
						)}</a> (${frappe.utils.escape_html(r.status || "")})</li>`,
				)
				.join("");
			return `<div style="border:1px solid var(--border-color);border-radius:10px;padding:12px;margin:8px 0">
				<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
					<div>
						<a href="/app/ic-quote/${encodeURIComponent(q.name)}"><strong>${frappe.utils.escape_html(
							q.quote_number || q.name,
						)}</strong></a>
						<span class="indicator-pill ${q.status === "Accepted" ? "green" : "orange"}">${frappe.utils.escape_html(
							q.status || "",
						)}</span>
						<div class="text-muted">${frappe.utils.escape_html(q.quote_type || "")} · ${frappe.utils.escape_html(
							q.service || "",
						)}</div>
						<div>${frappe.utils.escape_html(q.subject || q.description || "")}</div>
					</div>
					<div class="text-right"><strong>${format_currency(q.total_revenue)}</strong></div>
				</div>
				${tests ? `<div style="margin-top:8px"><strong>${__("Testing / work provided")}</strong><ul>${tests}</ul></div>` : ""}
				${reports ? `<div style="margin-top:8px"><strong>${__("Reports shared")}</strong><ul>${reports}</ul></div>` : ""}
			</div>`;
		})
		.join("");
	const totals = data.totals || {};
	return `<div>
		<div class="text-muted" style="margin-bottom:8px">
			${__("Quotes")}: ${totals.quotes || 0} · ${__("Accepted")}: ${totals.accepted || 0} · ${__("Reports")}: ${
				totals.reports || 0
			}
		</div>
		${rows}
	</div>`;
};

instacertify_crm.show_customer_history = function (args) {
	frappe.call({
		method: "instacertify_crm.api.get_customer_history",
		args,
		freeze: true,
		callback(r) {
			const d = new frappe.ui.Dialog({
				title: __("Customer past logs"),
				size: "large",
				fields: [{ fieldtype: "HTML", fieldname: "history" }],
			});
			d.fields_dict.history.$wrapper.html(
				instacertify_crm.render_customer_history(r.message || {}),
			);
			d.show();
		},
	});
};

instacertify_crm.create_document_request_dialog = function (quote) {
	frappe.call({
		method: "instacertify_crm.api.get_service_documents",
		args: { service: quote.service },
		freeze: true,
		callback(r) {
			const docs = r.message || [];
			if (!docs.length) {
				frappe.msgprint(
					__("No documents in the service library. Add them on IC Service, or create IC Document Request manually."),
				);
				return;
			}
			const d = new frappe.ui.Dialog({
				title: __("Select documents to request from customer"),
				fields: [
					{
						fieldtype: "HTML",
						fieldname: "help",
						options: `<p class="text-muted">${__(
							"Choose the checklist for this accepted quote. Only selected documents will be linked for customer upload.",
						)}</p>`,
					},
					{
						fieldname: "documents",
						fieldtype: "MultiCheck",
						label: __("Documents"),
						reqd: 1,
						options: docs.map((doc) => ({
							label: doc.document_name + (doc.required ? " *" : ""),
							value: doc.document_name,
							checked: !!doc.required,
						})),
					},
					{
						fieldname: "questionnaire",
						label: __("Questionnaire / remarks to customer"),
						fieldtype: "Small Text",
					},
				],
				primary_action_label: __("Create & copy link"),
				primary_action(values) {
					const selected = values.documents || [];
					if (!selected.length) {
						frappe.msgprint(__("Select at least one document"));
						return;
					}
					const payload = docs
						.filter((doc) => selected.includes(doc.document_name))
						.map((doc) => ({
							document_name: doc.document_name,
							description: doc.description,
							required: doc.required,
						}));
					frappe.call({
						method: "instacertify_crm.api.create_document_request",
						args: {
							quote: quote.name,
							documents: payload,
							questionnaire: values.questionnaire,
						},
						freeze: true,
						callback(res) {
							d.hide();
							if (res.message?.public_url) {
								instacertify_crm.copy_text(res.message.public_url);
								frappe.msgprint({
									title: __("Document request shared"),
									message: __(
										"Customer upload link copied.<br><a href='/app/ic-document-request/{0}'>Open {0}</a><br>{1}",
										[res.message.name, res.message.public_url],
									),
									indicator: "green",
								});
							}
						},
					});
				},
			});
			d.show();
		},
	});
};
