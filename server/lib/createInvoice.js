import fs from 'fs';
import PDFDocument from 'pdfkit';
import PDFTable from 'voilab-pdf-table';
const pageMargin = 50;
const columnGap = 30;
const cardPadding = 10;
function createInvoice(invoice, path) {
	let doc = new PDFDocument({ size: 'A4', margin: pageMargin });

	generateHeader(doc);
	generateCustomerInformation(doc, invoice);
	generateInvoiceTable(doc, invoice);
	generateFooter(doc);
	doc.end();
	doc.pipe(fs.createWriteStream(path));
}

function generateHeader(doc) {
	doc
		.image('logo.png', pageMargin, 45, { width: 210 })
		.fillColor('#444444')
		// .fontSize(20)
		// .text('ACME Inc.', 110, 57)
		.fontSize(10)
		.text('ACME Inc.', 200, 50, { align: 'right' })
		.text('123 Main Street', 200, 65, { align: 'right' })
		.text('New York, NY, 10025', 200, 80, { align: 'right' })
		.moveDown();
}

function generateCustomerInformation(doc, invoice) {
	doc.fillColor('#444444').fontSize(20).text('Invoice', pageMargin, doc.y).moveDown();
	const firstX = doc.x;
	const firstY = doc.y;
	const columnWidth = doc.page.width / 2 - pageMargin - columnGap / 2;
	const secondX = firstX + columnWidth + columnGap;
	const cardWidth = columnWidth + cardPadding * 2;
	const shippingAddress =
		invoice.shipping_address.first_name +
		' ' +
		invoice.shipping_address.last_name +
		'\n' +
		invoice.shipping_address.address1 +
		' ' +
		invoice.shipping_address.address2 +
		'\n' +
		invoice.shipping_address.city +
		', ' +
		invoice.shipping_address.state.name +
		', ' +
		invoice.shipping_address.country.name;
	const billingAddress =
		invoice.billing_address.first_name +
		' ' +
		invoice.billing_address.last_name +
		'\n' +
		invoice.billing_address.address1 +
		' ' +
		invoice.billing_address.address2 +
		'\n' +
		invoice.billing_address.city +
		', ' +
		invoice.billing_address.state.name +
		', ' +
		invoice.billing_address.country.name;
	doc
		.fontSize(12)
		.text('Sold To: \n', secondX, firstY)
		.fontSize(10)
		.text(billingAddress, { width: columnWidth })
		.fontSize(12)
		.text('Ship To: \n', pageMargin, firstY)
		.fontSize(10)
		.text(shippingAddress, { width: columnWidth });
	doc.roundedRect(firstX - cardPadding, firstY - cardPadding, cardWidth, doc.y - firstY + cardPadding * 2, 10);
	doc.roundedRect(secondX - cardPadding, firstY - cardPadding, cardWidth, doc.y - firstY + cardPadding * 2, 10);
	doc.moveDown();
	doc.moveDown();
	doc
		.fontSize(10)
		.text(`Invoice Number:\n ${invoice.invoice_number}`)
		.fontSize(10)
		.text(`Date:\n ${formatDate(new Date())}`)
		.moveDown();
}

function generateInvoiceTable(doc, invoice) {
	const table = new PDFTable(doc);
	table
		// add some plugins (here, a 'fit-to-width' for a column)
		.addPlugin(
			new (require('voilab-pdf-table/plugins/fitcolumn'))({
				column: 'name',
			})
		)
		// set defaults to your columns
		.setColumnsDefaults({
			headerBorder: 'B',
			align: 'right',
		})
		// add table columns
		.addColumns([
			{
				id: 'name',
				header: 'Name',
				align: 'left',
			},
			{
				id: 'code',
				header: 'Model',
				align: 'center',
				width: 100,
			},
			{
				id: 'quantity',
				header: 'Quantity',
				width: 50,
			},
			{
				id: 'price',
				header: 'Price',
				width: 40,
			},
		])
		// add events (here, we draw headers on each new page)
		.onPageAdded(function (tb) {
			tb.addHeader();
		});

	// draw content, by passing data to the addBody method
	table.addBody(
		invoice.items.map((item) => ({
			...item,
			price: item.special_price || item.price,
		}))
	);
	doc.moveDown();
	doc.fontSize(14).text('Total', { align: 'right' });
}

function generateFooter(doc) {
	doc
		.fontSize(10)
		.text('Payment is due within 15 days. Thank you for your business.', 50, 780, { align: 'center', width: 500 });
}

function generateTableRow(doc, y, item, name, unitCost, quantity, lineTotal) {
	const tmpY = doc.y;
	doc
		.fontSize(10)
		.text(item, 50, tmpY)
		.text(name + name + name, 150, tmpY, { width: 130 })
		.text(unitCost, 280, tmpY, { width: 90, align: 'right' })
		.text(quantity, 370, tmpY, { width: 90, align: 'right' })
		.text(lineTotal, 0, tmpY, { align: 'right' })
		.moveDown();
}

function generateHr(doc, y) {
	doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}

function formatCurrency(cents) {
	return '$' + cents;
}

function formatDate(date) {
	const day = date.getDate();
	const month = date.getMonth() + 1;
	const year = date.getFullYear();

	return year + '/' + month + '/' + day;
}
export default createInvoice;
