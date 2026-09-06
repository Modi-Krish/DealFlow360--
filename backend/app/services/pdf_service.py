import io
from datetime import datetime
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

def generate_invoice_pdf(invoice_dict: dict) -> bytes:
    """
    Generates a professional B2B Invoice / Bill PDF document.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY_COLOR = colors.HexColor("#0f172a") # Slate 900
    ACCENT_COLOR = colors.HexColor("#10b981")  # Emerald 500
    TEXT_MUTED = colors.HexColor("#64748b")    # Slate 500
    BG_LIGHT = colors.HexColor("#f8fafc")      # Slate 50

    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY_COLOR
    )

    normal_style = ParagraphStyle(
        'InvoiceNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=PRIMARY_COLOR
    )

    bold_style = ParagraphStyle(
        'InvoiceBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=PRIMARY_COLOR
    )

    right_bold = ParagraphStyle(
        'InvoiceRightBold',
        parent=bold_style,
        alignment=TA_RIGHT
    )

    right_normal = ParagraphStyle(
        'InvoiceRightNormal',
        parent=normal_style,
        alignment=TA_RIGHT
    )

    elements = []

    # 1. Header Section
    header_data = [
        [
            Paragraph("<b>DEALFLOW360</b><br/><font color='#64748b' size=8>Autonomous Sales & Fulfillment Platform</font>", title_style),
            Paragraph(f"<b>OFFICIAL INVOICE</b><br/><font color='#10b981' size=11><b>#{invoice_dict.get('invoice_number', 'INV-001')}</b></font><br/><font color='#64748b' size=8>Status: {invoice_dict.get('status', 'SENT')}</font>", ParagraphStyle('RightHead', parent=right_bold))
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=15))

    # 2. Bill To & Invoice Info Section
    inv_date = invoice_dict.get('created_at', datetime.now()).strftime("%B %d, %Y") if isinstance(invoice_dict.get('created_at'), datetime) else str(invoice_dict.get('created_at', 'Today'))
    due_date = invoice_dict.get('due_date', '').strftime("%B %d, %Y") if isinstance(invoice_dict.get('due_date'), datetime) else str(invoice_dict.get('due_date', '14 Days'))

    info_data = [
        [
            Paragraph(f"<b>BILL TO:</b><br/>{invoice_dict.get('customer_name', 'Valued B2B Customer')}<br/>{invoice_dict.get('customer_email', 'buyer@company.com')}<br/>{invoice_dict.get('delivery_address', 'Registered Business Address')}", normal_style),
            Paragraph(f"<b>SELLER / VENDOR:</b><br/>{invoice_dict.get('seller_name', 'Verified Seller Entity')}<br/>Tax ID: DE-39281048<br/>Verified B2B Account", normal_style),
            Paragraph(f"<b>INVOICE DETAILS:</b><br/>Invoice Date: {inv_date}<br/>Due Date: {due_date}<br/>Currency: USD ($)", normal_style)
        ]
    ]
    info_table = Table(info_data, colWidths=[180, 180, 180])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('PADDING', (0,0), (-1,-1), 10),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # 3. Line Items Table
    table_headers = [
        Paragraph("<b>Item & Description</b>", bold_style),
        Paragraph("<b>Quantity</b>", right_bold),
        Paragraph("<b>Unit Price</b>", right_bold),
        Paragraph("<b>Total Amount</b>", right_bold)
    ]
    items_rows = [table_headers]

    raw_items = invoice_dict.get('items', [])
    if not raw_items:
        qty = invoice_dict.get('quantity', 1)
        unit_price = Decimal(str(invoice_dict.get('unit_price', invoice_dict.get('amount_due', 0)))) / max(qty, 1)
        total_amt = Decimal(str(invoice_dict.get('amount_due', 0)))
        raw_items = [{
            'description': invoice_dict.get('product_name', 'B2B Procurement Goods'),
            'quantity': qty,
            'unit_price': unit_price,
            'total_amount': total_amt
        }]

    subtotal = Decimal('0.0')
    for item in raw_items:
        desc = item.get('description', item.get('product_name', 'Line Item'))
        q = item.get('quantity', 1)
        up = Decimal(str(item.get('unit_price', 0)))
        tot = Decimal(str(item.get('total_amount', up * q)))
        subtotal += tot

        items_rows.append([
            Paragraph(desc, normal_style),
            Paragraph(str(q), right_normal),
            Paragraph(f"${up:,.2f}", right_normal),
            Paragraph(f"${tot:,.2f}", right_bold)
        ])

    items_table = Table(items_rows, colWidths=[240, 80, 110, 110])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('TEXTCOLOR', (0,0), (-1,0), PRIMARY_COLOR),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # 4. Total Summary Block
    tax = Decimal('0.00')
    grand_total = subtotal + tax

    summary_data = [
        [Paragraph("Subtotal:", right_normal), Paragraph(f"${subtotal:,.2f}", right_bold)],
        [Paragraph("Tax (0% B2B Exempt):", right_normal), Paragraph("$0.00", right_normal)],
        [Paragraph("<b>TOTAL DUE:</b>", ParagraphStyle('TLabel', parent=right_bold, fontSize=11)), Paragraph(f"<b>${grand_total:,.2f}</b>", ParagraphStyle('TVal', parent=right_bold, fontSize=11, textColor=ACCENT_COLOR))]
    ]
    summary_table = Table(summary_data, colWidths=[400, 140])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 30))

    # 5. Footer & Terms
    footer_text = Paragraph(
        "<b>Payment Terms & Policy:</b> Payment due within 14 days of invoice issue. Electronic funds transfer or wire transfer accepted. "
        "Generated via DealFlow360 Autonomous Sales Operations System. Certified Immutable Record.",
        ParagraphStyle('Footer', parent=normal_style, fontSize=7, textColor=TEXT_MUTED, alignment=TA_CENTER)
    )
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=10))
    elements.append(footer_text)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def generate_quotation_pdf(bid_dict: dict) -> bytes:
    """
    Generates a professional B2B Proposal / Quotation PDF document.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    PRIMARY_COLOR = colors.HexColor("#0f172a")
    ACCENT_COLOR = colors.HexColor("#2563eb")  # Blue 600
    TEXT_MUTED = colors.HexColor("#64748b")
    BG_LIGHT = colors.HexColor("#f8fafc")

    title_style = ParagraphStyle(
        'QuoteTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY_COLOR
    )

    normal_style = ParagraphStyle(
        'QuoteNormal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=PRIMARY_COLOR
    )

    bold_style = ParagraphStyle(
        'QuoteBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=PRIMARY_COLOR
    )

    right_bold = ParagraphStyle('RightBold', parent=bold_style, alignment=TA_RIGHT)
    right_normal = ParagraphStyle('RightNormal', parent=normal_style, alignment=TA_RIGHT)

    elements = []

    # Header
    quote_num = bid_dict.get('bid_number', 'QT-001')
    status = bid_dict.get('status', 'PENDING_SELLER_REVIEW')
    
    header_data = [
        [
            Paragraph("<b>DEALFLOW360</b><br/><font color='#64748b' size=8>B2B Sales Quotation & Negotiation Protocol</font>", title_style),
            Paragraph(f"<b>B2B QUOTATION PROPOSAL</b><br/><font color='#2563eb' size=11><b>#{quote_num}</b></font><br/><font color='#64748b' size=8>Status: {status}</font>", right_bold)
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    elements.append(header_table)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=15))

    # Parties Info
    created = bid_dict.get('created_at', datetime.now())
    q_date = created.strftime("%B %d, %Y") if isinstance(created, datetime) else str(created)

    info_data = [
        [
            Paragraph(f"<b>BUYER ORGANISATION:</b><br/>{bid_dict.get('customer_name', 'Customer')}<br/>{bid_dict.get('customer_email', '')}<br/>{bid_dict.get('delivery_address', 'Specified Delivery Facility')}", normal_style),
            Paragraph(f"<b>SELLER ORGANISATION:</b><br/>{bid_dict.get('seller_name', 'Verified Vendor')}<br/>Deal Operations Team<br/>Direct Seller Partner", normal_style),
            Paragraph(f"<b>PROPOSAL METADATA:</b><br/>Date: {q_date}<br/>Proposal ID: {quote_num}<br/>Negotiation Active", normal_style)
        ]
    ]
    info_table = Table(info_data, colWidths=[180, 180, 180])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('PADDING', (0,0), (-1,-1), 10),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))

    # Table of items
    table_headers = [
        Paragraph("<b>Product Description</b>", bold_style),
        Paragraph("<b>Quantity</b>", right_bold),
        Paragraph("<b>List Price</b>", right_bold),
        Paragraph("<b>Offered Unit Price</b>", right_bold),
        Paragraph("<b>Total Amount</b>", right_bold)
    ]
    items_rows = [table_headers]

    raw_items = bid_dict.get('items', [])
    if not raw_items:
        qty = bid_dict.get('quantity', 1)
        orig_price = Decimal(str(bid_dict.get('original_price', 0)))
        prop_price = Decimal(str(bid_dict.get('proposed_price', 0)))
        tot_amount = Decimal(str(bid_dict.get('total_amount', prop_price * qty)))
        raw_items = [{
            'product_name': bid_dict.get('product_name', 'Primary Product Item'),
            'quantity': qty,
            'original_price': orig_price,
            'proposed_price': prop_price,
            'total_amount': tot_amount
        }]

    total_proposal_val = Decimal('0.0')
    for item in raw_items:
        p_name = item.get('product_name', 'Product Line Item')
        q = item.get('quantity', 1)
        orig = Decimal(str(item.get('original_price', 0)))
        prop = Decimal(str(item.get('proposed_price', 0)))
        tot = Decimal(str(item.get('total_amount', prop * q)))
        total_proposal_val += tot

        items_rows.append([
            Paragraph(p_name, normal_style),
            Paragraph(str(q), right_normal),
            Paragraph(f"${orig:,.2f}", right_normal),
            Paragraph(f"${prop:,.2f}", right_bold),
            Paragraph(f"${tot:,.2f}", right_bold)
        ])

    items_table = Table(items_rows, colWidths=[180, 60, 90, 100, 110])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))

    # Total Summary
    summary_data = [
        [Paragraph("<b>TOTAL PROPOSED DEAL VALUE:</b>", ParagraphStyle('TLabel', parent=right_bold, fontSize=11)), Paragraph(f"<b>${total_proposal_val:,.2f}</b>", ParagraphStyle('TVal', parent=right_bold, fontSize=11, textColor=ACCENT_COLOR))]
    ]
    summary_table = Table(summary_data, colWidths=[380, 160])
    summary_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('PADDING', (0,0), (-1,-1), 4)]))
    elements.append(summary_table)
    elements.append(Spacer(1, 25))

    # History log excerpt
    history = bid_dict.get('history', [])
    if history:
        elements.append(Paragraph("<b>NEGOTIATION LOG HISTORY:</b>", bold_style))
        elements.append(Spacer(1, 5))
        hist_rows = [[Paragraph("<b>Actor</b>", bold_style), Paragraph("<b>Action</b>", bold_style), Paragraph("<b>Offered Unit Price</b>", right_bold), Paragraph("<b>Timestamp & Notes</b>", normal_style)]]
        for h in history[-5:]:
            role = h.get('actor_role', 'USER')
            name = h.get('actor_name', 'User')
            act = h.get('action', 'ACTION')
            pr = Decimal(str(h.get('price', 0)))
            ts = str(h.get('timestamp', ''))[:16]
            msg = h.get('message', '')
            hist_rows.append([
                Paragraph(f"{role}: {name}", normal_style),
                Paragraph(act, bold_style),
                Paragraph(f"${pr:,.2f}", right_normal),
                Paragraph(f"{ts}<br/><font color='#64748b'>{msg}</font>", normal_style)
            ])
        hist_table = Table(hist_rows, colWidths=[120, 100, 100, 220])
        hist_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(hist_table)
        elements.append(Spacer(1, 20))

    footer_text = Paragraph(
        "DealFlow360 Autonomous Sales Operations Protocol • Multi-Vendor B2B Proposal Document",
        ParagraphStyle('Footer', parent=normal_style, fontSize=7, textColor=TEXT_MUTED, alignment=TA_CENTER)
    )
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=10))
    elements.append(footer_text)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
