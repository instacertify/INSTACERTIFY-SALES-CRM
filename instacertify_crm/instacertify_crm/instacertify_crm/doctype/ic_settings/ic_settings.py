# Copyright (c) 2026, Instacertify Labs Pvt Ltd and contributors
# For license information, please see license.txt

from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.utils import cint, get_url


class ICSettings(Document):
	def validate(self):
		self.brand_name = (self.brand_name or "Instacertify").strip()
		self.legal_name = (self.legal_name or self.brand_name).strip()

	def on_update(self):
		frappe.cache().delete_value("ic_branding")
		if cint(self.apply_letter_head):
			sync_letter_head(self)
		if cint(self.apply_logo_sitewide):
			sync_website_branding(self)


def get_branding(use_cache: bool = True) -> dict:
	"""Resolved branding for quotes, portals and letterhead."""
	cache_key = "ic_branding"
	if use_cache:
		cached = frappe.cache().get_value(cache_key)
		if cached:
			return cached

	defaults = {
		"brand_name": "Instacertify",
		"legal_name": "Instacertify Labs Pvt Ltd",
		"tagline": "certifications made simple",
		"company_logo": "/assets/instacertify_crm/images/logo.svg",
		"letterhead_logo": "/assets/instacertify_crm/images/logo.svg",
		"favicon": "",
		"phone": "+91 9999118039",
		"email": "contact@instacertify.com",
		"website": "www.instacertify.com",
		"address_line": "PK 1 Sector 63 A Noida, Uttar Pradesh, India - 201301",
		"cin": "UP74999UP2022PTC170291",
	}

	if not frappe.db.exists("DocType", "IC Settings"):
		branding = {
			**defaults,
			"company_logo_url": absolute_url(defaults["company_logo"]),
			"letterhead_logo_url": absolute_url(defaults["letterhead_logo"]),
		}
		return branding

	try:
		doc = frappe.get_cached_doc("IC Settings")
	except Exception:
		return {
			**defaults,
			"company_logo_url": absolute_url(defaults["company_logo"]),
			"letterhead_logo_url": absolute_url(defaults["letterhead_logo"]),
		}

	company_logo = doc.company_logo or defaults["company_logo"]
	letterhead_logo = doc.letterhead_logo or company_logo
	branding = {
		"brand_name": doc.brand_name or defaults["brand_name"],
		"legal_name": doc.legal_name or defaults["legal_name"],
		"tagline": doc.tagline or defaults["tagline"],
		"company_logo": company_logo,
		"letterhead_logo": letterhead_logo,
		"favicon": doc.favicon or "",
		"phone": doc.phone or defaults["phone"],
		"email": doc.email or defaults["email"],
		"website": doc.website or defaults["website"],
		"address_line": doc.address_line or defaults["address_line"],
		"cin": doc.cin or defaults["cin"],
		"company_logo_url": absolute_url(company_logo),
		"letterhead_logo_url": absolute_url(letterhead_logo),
	}
	frappe.cache().set_value(cache_key, branding, expires_in_sec=3600)
	return branding


def absolute_url(path: str | None) -> str:
	if not path:
		return ""
	if path.startswith("http://") or path.startswith("https://"):
		return path
	return get_url(path)


def sync_letter_head(settings: ICSettings | None = None):
	"""Create/update Letter Head 'Instacertify' used by print formats."""
	settings = settings or frappe.get_single("IC Settings")
	# Rebuild without cache so latest logo is used
	frappe.cache().delete_value("ic_branding")
	branding = get_branding(use_cache=False)
	logo_path = branding.get("letterhead_logo") or branding.get("company_logo")
	logo_url = branding.get("letterhead_logo_url") or branding.get("company_logo_url")

	logo_html = (
		f"<img src='{logo_url}' style='max-height:64px;max-width:220px;object-fit:contain;margin-bottom:8px;' />"
		if logo_url
		else ""
	)
	content = f"""
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:4px solid #0A4A6C;padding-bottom:12px;margin-bottom:12px;">
  <div>
    {logo_html}
    <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;">
      <span style="color:#0A4A6C">Insta</span><span style="color:#EB7D2D">certify</span>
    </div>
    <div style="color:#5F5E6B;font-size:12px;">{branding.get("tagline") or ""}</div>
    <div style="color:#5F5E6B;font-size:12px;">{branding.get("legal_name") or ""}</div>
  </div>
  <div style="text-align:right;color:#5F5E6B;font-size:11px;line-height:1.45;">
    <div>{branding.get("address_line") or ""}</div>
    <div>{branding.get("phone") or ""} · {branding.get("email") or ""}</div>
    <div>{branding.get("website") or ""}</div>
    {"<div>CIN: " + branding.get("cin") + "</div>" if branding.get("cin") else ""}
  </div>
</div>
"""
	footer = f"""
<div style="margin-top:16px;border-top:1px solid #d7e2ea;padding-top:8px;color:#5F5E6B;font-size:10px;">
  {branding.get("legal_name") or ""} · {branding.get("website") or ""} · {branding.get("phone") or ""}
</div>
"""
	name = "Instacertify"
	values = {
		"source": "HTML",
		"footer_source": "HTML",
		"content": content,
		"footer": footer,
		"is_default": 1,
		"disabled": 0,
		"image": logo_path if logo_path and not logo_path.startswith("/assets/") else None,
		"align": "Left",
	}

	if frappe.db.exists("Letter Head", name):
		doc = frappe.get_doc("Letter Head", name)
		doc.update(values)
		doc.save(ignore_permissions=True)
	else:
		doc = frappe.get_doc({"doctype": "Letter Head", "letter_head_name": name, **values})
		doc.insert(ignore_permissions=True)

	try:
		frappe.db.set_default("letter_head", name)
	except Exception:
		pass

	# Also set company letter head when a default company exists
	company = frappe.db.get_single_value("Global Defaults", "default_company")
	if company and frappe.db.has_column("Company", "default_letter_head"):
		try:
			frappe.db.set_value("Company", company, "default_letter_head", name, update_modified=False)
		except Exception:
			pass


def sync_website_branding(settings: ICSettings | None = None):
	"""Push logo/favicon into Website Settings for sitewide use."""
	settings = settings or frappe.get_single("IC Settings")
	frappe.cache().delete_value("ic_branding")
	branding = get_branding(use_cache=False)
	ws = frappe.get_single("Website Settings")
	changed = False
	logo = branding.get("company_logo")
	if logo:
		for field in ("banner_image", "app_logo", "splash_image", "footer_logo"):
			if ws.meta.has_field(field) and getattr(ws, field, None) != logo:
				setattr(ws, field, logo)
				changed = True
	if branding.get("favicon") and ws.meta.has_field("favicon"):
		if ws.favicon != branding["favicon"]:
			ws.favicon = branding["favicon"]
			changed = True
	if branding.get("brand_name") and ws.meta.has_field("app_name"):
		if ws.app_name != branding["brand_name"]:
			ws.app_name = branding["brand_name"]
			changed = True
	if changed:
		ws.flags.ignore_permissions = True
		ws.save(ignore_permissions=True)
