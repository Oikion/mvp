# Properties Model — Field Checklist

Use this checklist to mark which fields are needed for your use case.

---

## Identity & Metadata

- [ ] `id` — UUID primary key
- [ ] `friendlyId` — Human-readable ID (unique per org)
- [ ] `createdAt` — Auto-set on creation
- [ ] `createdBy` — User who created
- [ ] `updatedAt` — Last modification
- [ ] `updatedBy` — User who last updated
- [ ] `assigned_to` — Assigned agent
- [ ] `organizationId` — Tenant isolation key
- [ ] `draft_status` — Whether property is a draft

## Basic Property Info

- [ ] `property_name` — Free text (required)
- [ ] `property_type` — RESIDENTIAL, COMMERCIAL, LAND, RENTAL, VACATION, APARTMENT, HOUSE, MAISONETTE, WAREHOUSE, PARKING, PLOT, FARM, INDUSTRIAL, OTHER
- [ ] `property_status` — ACTIVE, PENDING, SOLD, OFF_MARKET, WITHDRAWN
- [ ] `transaction_type` — SALE, RENTAL, SHORT_TERM, EXCHANGE, AUCTION
- [ ] `condition` — EXCELLENT, VERY_GOOD, GOOD, NEEDS_RENOVATION
- [ ] `description` — Free text description

## Location / Address

- [ ] `address_street` — Street address
- [ ] `address_city` — City
- [ ] `address_state` — State / prefecture
- [ ] `address_zip` — Postal code
- [ ] `postal_code` — Alternate postal code field
- [ ] `area` — Neighborhood / area
- [ ] `municipality` — Δήμος
- [ ] `region` — Περιφέρεια
- [ ] `regional_unit` — Περιφερειακή Ενότητα
- [ ] `address_privacy_level` — EXACT, PARTIAL, HIDDEN

## Dimensions & Layout

- [ ] `size_net_sqm` — Net area (m²)
- [ ] `size_gross_sqm` — Gross area (m²)
- [ ] `square_feet` — Area in sq ft
- [ ] `plot_size_sqm` — Plot / land size (m²)
- [ ] `lot_size` — Lot size
- [ ] `bedrooms` — Number of bedrooms
- [ ] `bathrooms` — Number of bathrooms
- [ ] `floor` — Floor level
- [ ] `floors_total` — Total building floors

## Pricing

- [ ] `price` — Asking price
- [ ] `price_type` — RENTAL, SALE, PER_ACRE, PER_SQM
- [ ] `monthly_common_charges` — Κοινόχρηστα

## Features & Amenities

- [ ] `furnished` — NO, PARTIALLY, FULLY
- [ ] `heating_type` — AUTONOMOUS, CENTRAL, NATURAL_GAS, HEAT_PUMP, ELECTRIC, NONE
- [ ] `elevator` — Has elevator
- [ ] `accepts_pets` — Pet-friendly
- [ ] `accessibility` — Accessibility info
- [ ] `amenities` — Flexible JSON amenity list
- [ ] `orientation` — JSON compass orientations

## Construction & Legal (Greek-specific)

- [ ] `year_built` — Construction year
- [ ] `renovated_year` — Last renovation year
- [ ] `energy_cert_class` — A_PLUS, A, B, C, D, E, F, G, H, IN_PROGRESS
- [ ] `frontage_m` — Frontage length in meters
- [ ] `frontage_type` — MAIN_ROAD, SECONDARY_ROAD, PEDESTRIAN, CORNER, SQUARE, CUL_DE_SAC, NONE
- [ ] `build_coefficient` — Συντελεστής δόμησης
- [ ] `coverage_ratio` — Ποσοστό κάλυψης
- [ ] `inside_city_plan` — Εντός σχεδίου
- [ ] `building_block_ot` — Οικοδομικό τετράγωνο (ΟΤ)
- [ ] `building_permit_no` — Αριθμός οικοδομικής αδείας
- [ ] `building_permit_year` — Year of building permit
- [ ] `legalization_status` — LEGALIZED, IN_PROGRESS, UNDECLARED
- [ ] `land_registry_kaek` — Κτηματολόγιο ΚΑΕΚ code
- [ ] `land_registry_office` — Κτηματολογικό γραφείο
- [ ] `objective_zone` — Αντικειμενική ζώνη (tax zone)
- [ ] `etaireia_diaxeirisis` — Management company

## Rental-Specific

- [ ] `min_lease_months` — Minimum lease duration
- [ ] `available_from` — Availability date

## Visibility & Sharing

- [ ] `visibility` — HIDDEN, PRIVATE, SECURE, PUBLIC
- [ ] `is_exclusive` — Exclusive listing
- [ ] `watchers` — Array of user IDs watching this property

## Sales Metrics / Analytics

- [ ] `listPrice` — Original listing price
- [ ] `salePrice` — Final sale price
- [ ] `saleDate` — When property sold
- [ ] `contractDate` — Contract signing date
- [ ] `daysOnMarket` — Calculated days on market
- [ ] `estimatedPrice` — CMA accuracy tracking

## Contact & Notes

- [ ] `primary_email` — Contact email (encrypted)
- [ ] `communication_notes` — Notes JSON (encrypted)
- [ ] `property_preferences` — Flexible preferences JSON

## XE.gr Portal Integration

- [ ] `xePublished` — Published to XE.gr
- [ ] `xeRefId` — External XE.gr reference ID

## Relations

- [ ] `Client_Properties` — Linked clients
- [ ] `Deal` — Associated deals
- [ ] `ProfileShowcaseProperty` — Agent profile showcase
- [ ] `Users (assigned_to)` — Assigned agent relation
- [ ] `PropertyComment` — Comments
- [ ] `Property_Contacts` — External contacts
- [ ] `Documents` — Attached documents
- [ ] `CalendarEvent` — Scheduled events
- [ ] `Users (watchers)` — Watching users
- [ ] `PropertyShowing` — Property showings
- [ ] `XeSyncItems` — XE.gr sync records
- [ ] `Mandate_Properties` — Linked mandates
- [ ] `PropertyImage` — Property images
