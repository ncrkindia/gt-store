package com.gtstore.invoiceservice.util;

import com.gtstore.invoiceservice.dto.OrderDto;
import com.gtstore.invoiceservice.dto.OrderItemDto;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;

public class PdfGenerator {

    private static final Font FONT_LOGO = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(113, 24, 122));
    private static final Font FONT_TITLE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.BLACK);
    private static final Font FONT_BOLD_LARGE = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Color.BLACK);
    private static final Font FONT_BOLD_MED = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK);
    private static final Font FONT_NORMAL = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
    private static final Font FONT_SMALL = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.DARK_GRAY);

    private static final Color LIGHT_GRAY = new Color(240, 240, 240);
    private static final Color TABLE_HEADER_GRAY = new Color(224, 224, 224);
    private static final Color BORDER_COLOR = Color.GRAY;

    public static byte[] generateInvoice(OrderDto order, long invoiceNo) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        // Reduce margins for better fit
        Document document = new Document(PageSize.A4, 25, 25, 25, 25);
        PdfWriter.getInstance(document, out);

        document.open();

        DateTimeFormatter df = DateTimeFormatter.ofPattern("dd-MM-yy");
        String dateStr = order.getCreatedAt() != null ? order.getCreatedAt().format(df) : "N/A";

        // --- 1. TOP HEADER (Logo, Company details, Title) ---
        PdfPTable header = new PdfPTable(new float[] { 1, 3, 1.5f });
        header.setWidthPercentage(100);

        PdfPCell logoCell = createCell(Rectangle.NO_BORDER);
        logoCell.addElement(new Phrase("GT STORE", FONT_LOGO));
        header.addCell(logoCell);

        PdfPCell companyInfoCell = createCell(Rectangle.NO_BORDER);
        companyInfoCell.addElement(new Phrase("GT STORE TRADING PRIVATE LIMITED", FONT_BOLD_MED));
        companyInfoCell.addElement(new Phrase("Tower 5, Cyberhub SEZ, Phase 2, Gurugram, Haryana 122002", FONT_SMALL));
        header.addCell(companyInfoCell);

        PdfPCell titleCell = createCell(Rectangle.NO_BORDER);
        titleCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph tPar = new Paragraph("Tax Invoice", FONT_TITLE);
        tPar.setAlignment(Element.ALIGN_RIGHT);
        Paragraph subPar = new Paragraph("(Original copy for recipient)", FONT_SMALL);
        subPar.setAlignment(Element.ALIGN_RIGHT);
        titleCell.addElement(tPar);
        titleCell.addElement(subPar);
        header.addCell(titleCell);

        document.add(header);
        document.add(new Paragraph(" ")); // spacing

        // --- 2. GST / REFERENCE ROW ---
        // Thin border separates header
        PdfPTable metaBar = new PdfPTable(new float[] { 1.2f, 3f });
        metaBar.setWidthPercentage(100);

        PdfPCell mLeft = createCell(Rectangle.TOP | Rectangle.BOTTOM);
        mLeft.setPadding(5f);
        mLeft.setBorderColor(BORDER_COLOR);
        mLeft.addElement(new Phrase("GST No : 07AABCBXXXXXXXX", FONT_BOLD_MED));
        mLeft.addElement(new Phrase("PAN : AADCCXXXXX", FONT_BOLD_MED));
        metaBar.addCell(mLeft);

        PdfPCell mRight = createCell(Rectangle.TOP | Rectangle.BOTTOM);
        mRight.setPadding(5f);
        mRight.setBorderColor(BORDER_COLOR);
        Paragraph oNo = new Paragraph();
        oNo.add(new Phrase("Order No : ", FONT_BOLD_MED));
        oNo.add(new Phrase(order.getOrderNumber() != null ? order.getOrderNumber() : order.getId().toUpperCase(),
                FONT_NORMAL)); // Use visual Order Number / ID
        oNo.add(new Phrase("   Dated : ", FONT_BOLD_MED));
        oNo.add(new Phrase(dateStr, FONT_NORMAL));

        Paragraph dNo = new Paragraph();
        dNo.add(new Phrase("Invoice No : ", FONT_BOLD_MED)); // Named Invoice No
        dNo.add(new Phrase(String.valueOf(invoiceNo), FONT_NORMAL)); // Show the derived incremental number
        dNo.add(new Phrase("   Dated : ", FONT_BOLD_MED));
        dNo.add(new Phrase(dateStr, FONT_NORMAL));

        mRight.addElement(oNo);
        mRight.addElement(dNo);
        metaBar.addCell(mRight);
        document.add(metaBar);
        document.add(new Paragraph("\n"));

        // --- 3. ADDRESS SECTION (Bill To | Ship To) ---
        PdfPTable addrTable = new PdfPTable(2);
        addrTable.setWidthPercentage(100);

        // Bill To
        PdfPCell billCell = createCell(Rectangle.NO_BORDER);
        billCell.addElement(new Phrase("Bill to", FONT_BOLD_LARGE));
        billCell.addElement(new Phrase(
                "\nName : " + (order.getCustomerName() != null ? order.getCustomerName() : "Customer"), FONT_BOLD_MED));
        billCell.addElement(new Phrase(
                "Number : " + (order.getCustomerPhone() != null ? order.getCustomerPhone() : "N/A"), FONT_BOLD_MED));
        billCell.addElement(new Phrase("Address : " + order.getShippingLine1()
                + (order.getShippingLine2() != null ? ", " + order.getShippingLine2() : ""), FONT_BOLD_MED));
        billCell.addElement(new Phrase("PIN : " + order.getShippingPincode() + " State : " + order.getShippingState(),
                FONT_BOLD_MED));
        billCell.addElement(new Phrase("GSTIN / PAN : None", FONT_BOLD_MED));
        addrTable.addCell(billCell);

        // Ship To
        PdfPCell shipCell = createCell(Rectangle.NO_BORDER);
        shipCell.addElement(new Phrase("Ship to", FONT_BOLD_LARGE));
        shipCell.addElement(new Phrase(
                "\nName : " + (order.getCustomerName() != null ? order.getCustomerName() : "Customer"), FONT_BOLD_MED));
        shipCell.addElement(new Phrase(
                "Number : " + (order.getCustomerPhone() != null ? order.getCustomerPhone() : "N/A"), FONT_BOLD_MED));
        shipCell.addElement(new Phrase("Address : " + order.getShippingLine1()
                + (order.getShippingLine2() != null ? ", " + order.getShippingLine2() : ""), FONT_BOLD_MED));
        shipCell.addElement(new Phrase("PIN : " + order.getShippingPincode(), FONT_BOLD_MED));
        shipCell.addElement(new Phrase("State : " + order.getShippingState(), FONT_BOLD_MED));
        addrTable.addCell(shipCell);

        document.add(addrTable);
        document.add(new Paragraph("\n"));

        // --- 4. PRODUCTS GRID TABLE (Rigid Border structure) ---
        // Structure: [Sr, Code, Desc, UnitPrice(Excl), GST(18%), NetRate(Incl), Qty,
        // Total]
        // Columns: Sr, Product Code, Product Name, Unit Price, Coupon Disc., Points
        // Used, GST %, Qty, Total
        float[] pWidths = { 0.5f, 1.5f, 2.5f, 1.1f, 1.1f, 1.1f, 0.8f, 0.6f, 1.2f };
        PdfPTable pTable = new PdfPTable(pWidths);
        pTable.setWidthPercentage(100);

        // Headers
        String[] headers = { "Sr.", "Product Code", "Product Name", "Unit Price", "Coupon Disc.", "Points Used",
                "GST %", "Qty",
                "Total" };
        for (String h : headers) {
            PdfPCell ch = new PdfPCell(new Phrase(h, FONT_BOLD_MED));
            ch.setBackgroundColor(TABLE_HEADER_GRAY);
            ch.setBorderColor(BORDER_COLOR);
            ch.setPadding(6);
            ch.setHorizontalAlignment(Element.ALIGN_CENTER);
            pTable.addCell(ch);
        }

        // Body Rows
        int sr = 1;
        int totalQty = 0;
        BigDecimal globalTaxableTotal = BigDecimal.ZERO;
        BigDecimal globalGstTotal = BigDecimal.ZERO;
        BigDecimal totalOfferExcl = BigDecimal.ZERO;
        BigDecimal totalDiscountExcl = BigDecimal.ZERO;
        BigDecimal totalPointsExcl = BigDecimal.ZERO;

        BigDecimal offerSubtotal = BigDecimal.ZERO;
        if (order.getItems() != null) {
            for (OrderItemDto item : order.getItems()) {
                BigDecimal itemOfferPrice = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
                offerSubtotal = offerSubtotal.add(itemOfferPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
            }
        }

        if (order.getItems() != null) {
            for (OrderItemDto item : order.getItems()) {
                Integer pct = item.getGstPercentage();
                BigDecimal taxFactor = BigDecimal.ONE.add(
                        BigDecimal.valueOf(pct).divide(BigDecimal.valueOf(100)));

                BigDecimal itemOfferPrice = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
                BigDecimal itemOfferTotal = itemOfferPrice.multiply(BigDecimal.valueOf(item.getQuantity()));

                // Retrieve the pre-calculated, fixed values stored in the order item
                BigDecimal propDiscount = item.getDiscountAmount();
                BigDecimal propPoints = item.getLoyaltyPointsUsed();

                // Fallback to on-the-fly proportional calculation for legacy orders
                if (propDiscount == null || propPoints == null) {
                    if (offerSubtotal.compareTo(BigDecimal.ZERO) > 0) {
                        propDiscount = order.getDiscountAmount().multiply(itemOfferTotal).divide(offerSubtotal, 4,
                                RoundingMode.HALF_UP);
                        propPoints = order.getLoyaltyPointsUsed().multiply(itemOfferTotal).divide(offerSubtotal, 4,
                                RoundingMode.HALF_UP);
                    } else {
                        propDiscount = BigDecimal.ZERO;
                        propPoints = BigDecimal.ZERO;
                    }
                }

                BigDecimal finalPaidPriceTotal = itemOfferTotal.subtract(propDiscount).subtract(propPoints);
                BigDecimal taxableTotal = finalPaidPriceTotal.divide(taxFactor, 4, RoundingMode.HALF_UP);
                BigDecimal gstTotal = finalPaidPriceTotal.subtract(taxableTotal);

                BigDecimal offerPriceExclTotal = itemOfferTotal.divide(taxFactor, 4, RoundingMode.HALF_UP);
                BigDecimal discountExclTotal = propDiscount.divide(taxFactor, 4, RoundingMode.HALF_UP);
                BigDecimal pointsExclTotal = propPoints.divide(taxFactor, 4, RoundingMode.HALF_UP);

                totalOfferExcl = totalOfferExcl.add(offerPriceExclTotal);
                totalDiscountExcl = totalDiscountExcl.add(discountExclTotal);
                totalPointsExcl = totalPointsExcl.add(pointsExclTotal);
                globalTaxableTotal = globalTaxableTotal.add(taxableTotal);
                globalGstTotal = globalGstTotal.add(gstTotal);

                pTable.addCell(createDataCell(String.format("%02d", sr++), Element.ALIGN_CENTER));
                pTable.addCell(createDataCell(item.getProductId().toUpperCase(), Element.ALIGN_LEFT));
                pTable.addCell(createDataCell(item.getProductName() != null ? item.getProductName() : "Product Item",
                        Element.ALIGN_LEFT));
                pTable.addCell(createDataCell(itemOfferPrice.setScale(2, RoundingMode.HALF_UP).toString(),
                        Element.ALIGN_RIGHT));
                pTable.addCell(
                        createDataCell(propDiscount.setScale(2, RoundingMode.HALF_UP).toString(), Element.ALIGN_RIGHT));
                pTable.addCell(
                        createDataCell(propPoints.setScale(2, RoundingMode.HALF_UP).toString(), Element.ALIGN_RIGHT));
                pTable.addCell(createDataCell(pct + "%", Element.ALIGN_CENTER));
                pTable.addCell(createDataCell(String.valueOf(item.getQuantity()), Element.ALIGN_CENTER));
                pTable.addCell(createDataCell(finalPaidPriceTotal.setScale(2, RoundingMode.HALF_UP).toString(),
                        Element.ALIGN_RIGHT));

                totalQty += item.getQuantity();
            }
        }

        // Total Row within table (7 cols spanned out of 9 total cols)
        PdfPCell totalLbl = new PdfPCell(new Phrase("TOTAL SUMMATION", FONT_BOLD_MED));
        totalLbl.setColspan(7);
        totalLbl.setBackgroundColor(LIGHT_GRAY);
        totalLbl.setBorderColor(BORDER_COLOR);
        totalLbl.setPadding(5);
        totalLbl.setHorizontalAlignment(Element.ALIGN_RIGHT);
        pTable.addCell(totalLbl);

        PdfPCell tQtyCell = new PdfPCell(new Phrase(totalQty + " N", FONT_BOLD_MED));
        tQtyCell.setBackgroundColor(LIGHT_GRAY);
        tQtyCell.setBorderColor(BORDER_COLOR);
        tQtyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        tQtyCell.setPadding(5);
        pTable.addCell(tQtyCell);

        BigDecimal netItemsPaidTotal = offerSubtotal.subtract(order.getDiscountAmount())
                .subtract(order.getLoyaltyPointsUsed());
        PdfPCell tValCell = new PdfPCell(
                new Phrase(netItemsPaidTotal.setScale(2, RoundingMode.HALF_UP).toString(), FONT_BOLD_MED));
        tValCell.setBackgroundColor(LIGHT_GRAY);
        tValCell.setBorderColor(BORDER_COLOR);
        tValCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        tValCell.setPadding(5);
        pTable.addCell(tValCell);

        document.add(pTable);
        document.add(new Paragraph("\n"));

        // --- 5. BOTTOM WRAPPER (Payment Details | Financial Calculations) ---
        PdfPTable footerWrapper = new PdfPTable(new float[] { 1.2f, 1f });
        footerWrapper.setWidthPercentage(100);

        // Left Sub-Table: Payment Details
        PdfPCell leftCell = createCell(Rectangle.NO_BORDER);
        leftCell.setPaddingRight(20f);

        PdfPTable payTable = new PdfPTable(new float[] { 0.5f, 2f, 1.2f, 1.2f });
        payTable.setWidthPercentage(100);

        PdfPCell payTitle = new PdfPCell(new Phrase("Payment Details", FONT_BOLD_MED));
        payTitle.setColspan(4);
        payTitle.setBackgroundColor(TABLE_HEADER_GRAY);
        payTitle.setBorderColor(BORDER_COLOR);
        payTable.addCell(payTitle);

        String[] payHead = { "Sr", "Payment Mode", "Date", "Amount" };
        for (String h : payHead) {
            PdfPCell c = new PdfPCell(new Phrase(h, FONT_BOLD_MED));
            c.setBackgroundColor(LIGHT_GRAY);
            c.setBorderColor(BORDER_COLOR);
            c.setPadding(4);
            payTable.addCell(c);
        }

        // Row 1
        payTable.addCell(createDataCell("01", Element.ALIGN_CENTER));
        payTable.addCell(createDataCell(order.getPaymentMethod() != null ? order.getPaymentMethod() : "Online",
                Element.ALIGN_LEFT));
        payTable.addCell(createDataCell(dateStr, Element.ALIGN_CENTER));
        payTable.addCell(createDataCell(order.getTotalAmount().toString(), Element.ALIGN_RIGHT));

        leftCell.addElement(payTable);
        footerWrapper.addCell(leftCell);

        // Right Sub-Table: Calculations breakdown
        PdfPCell rightCell = createCell(Rectangle.NO_BORDER);

        BigDecimal total = order.getTotalAmount();

        PdfPTable calcTable = new PdfPTable(new float[] { 3, 1 });
        calcTable.setWidthPercentage(100);
        calcTable.getDefaultCell().setBorderColor(BORDER_COLOR);
        calcTable.getDefaultCell().setPadding(5);

        addRowToCalc(calcTable, "Total Cart Value",
                offerSubtotal.setScale(2, RoundingMode.HALF_UP).toString());
        if (order.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            String discountLbl = "Coupon Discount"
                    + (order.getCouponCode() != null ? " (" + order.getCouponCode() + ")" : "");
            addRowToCalc(calcTable, discountLbl,
                    "- " + order.getDiscountAmount().setScale(2, RoundingMode.HALF_UP).toString());
        }
        if (order.getLoyaltyPointsUsed().compareTo(BigDecimal.ZERO) > 0) {
            addRowToCalc(calcTable, "Points Used",
                    "- " + order.getLoyaltyPointsUsed().setScale(2, RoundingMode.HALF_UP).toString());
        }

        addRowToCalc(calcTable, "Final Cart Value", netItemsPaidTotal.setScale(2, RoundingMode.HALF_UP).toString());
        addRowToCalc(calcTable, "", "");

        addRowToCalc(calcTable, "Total Taxable Base Value (Excl. GST)",
                globalTaxableTotal.setScale(2, RoundingMode.HALF_UP).toString());

        BigDecimal cgstVal = globalGstTotal.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        BigDecimal sgstVal = globalGstTotal.subtract(cgstVal);
        addRowToCalc(calcTable, "CGST (Central Tax)", cgstVal.toString());
        addRowToCalc(calcTable, "SGST (State Tax)", sgstVal.toString());
        addRowToCalc(calcTable, "Total GST (CGST+SGST)", globalGstTotal.setScale(2, RoundingMode.HALF_UP).toString());

        if (order.getShippingCharge().compareTo(BigDecimal.ZERO) > 0) {
            addRowToCalc(calcTable, "Shipping Charges",
                    "+ " + order.getShippingCharge().setScale(2, RoundingMode.HALF_UP).toString());
        }
        if (order.getCodCharge().compareTo(BigDecimal.ZERO) > 0) {
            addRowToCalc(calcTable, "COD Charges",
                    "+ " + order.getCodCharge().setScale(2, RoundingMode.HALF_UP).toString());
        }

        // Bold total rows
        PdfPCell totalCap = new PdfPCell(new Phrase("Total Invoice Price", FONT_BOLD_MED));
        totalCap.setBorderColor(BORDER_COLOR);
        totalCap.setPadding(5);
        calcTable.addCell(totalCap);

        PdfPCell totalValC = new PdfPCell(new Phrase(total.toString(), FONT_BOLD_MED));
        totalValC.setHorizontalAlignment(Element.ALIGN_RIGHT);
        totalValC.setBorderColor(BORDER_COLOR);
        totalValC.setPadding(5);
        calcTable.addCell(totalValC);

        // Final row
        PdfPCell finalCap = new PdfPCell(new Phrase("Total Payable Amount (Rounded)", FONT_BOLD_MED));
        finalCap.setBorderColor(BORDER_COLOR);
        finalCap.setPadding(5);
        calcTable.addCell(finalCap);

        PdfPCell finalValC = new PdfPCell(
                new Phrase(total.setScale(0, RoundingMode.HALF_UP).toString(), FONT_BOLD_LARGE));
        finalValC.setHorizontalAlignment(Element.ALIGN_RIGHT);
        finalValC.setBorderColor(BORDER_COLOR);
        finalValC.setPadding(5);
        calcTable.addCell(finalValC);

        rightCell.addElement(calcTable);
        footerWrapper.addCell(rightCell);

        document.add(footerWrapper);

        // Bottom boilerplate
        Paragraph note = new Paragraph("\n\nTerms & Conditions:\n"
                + "1. This is a computer generated invoice. No signature required.\n"
                + "2. Subject to local jurisdiction laws.\n"
                + "3. Any concerns should be reported within 24 hours of delivery.", FONT_SMALL);
        document.add(note);

        document.close();
        return out.toByteArray();
    }

    private static void addRowToCalc(PdfPTable table, String label, String value) {
        PdfPCell l = new PdfPCell(new Phrase(label, FONT_NORMAL));
        l.setBorderColor(BORDER_COLOR);
        l.setPadding(5);
        table.addCell(l);

        PdfPCell v = new PdfPCell(new Phrase(value, FONT_NORMAL));
        v.setHorizontalAlignment(Element.ALIGN_RIGHT);
        v.setBorderColor(BORDER_COLOR);
        v.setPadding(5);
        table.addCell(v);
    }

    private static PdfPCell createCell(int border) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(border);
        cell.setPadding(0);
        return cell;
    }

    private static PdfPCell createDataCell(String content, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(content, FONT_NORMAL));
        cell.setBorderColor(BORDER_COLOR);
        cell.setHorizontalAlignment(align);
        cell.setPadding(5);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }
}
