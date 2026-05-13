var db = db.getSiblingDB('gtstore_catalog');

print("--- Running Automated Relational Analysis ---");

// Helper to generate slug
function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// 1. Process Brands
var distinctBrands = db.products.distinct('brand');
var brandCount = 0;

distinctBrands.forEach(function(bName) {
  if (!bName) return;
  var trimmedName = bName.trim();
  if (!trimmedName) return;

  // Check case-insensitively by name
  var exists = db.brands.findOne({ 
    name: { $regex: "^" + trimmedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", $options: "i" } 
  });

  if (!exists) {
    var generatedSlug = slugify(trimmedName);
    
    // Double-check slug uniqueness
    var slugExists = db.brands.findOne({ slug: generatedSlug });
    if (slugExists) {
      generatedSlug += "-" + Math.floor(Math.random() * 1000);
    }

    db.brands.insertOne({
      name: trimmedName,
      slug: generatedSlug,
      description: "Official collection manufactured and distributed by " + trimmedName + ".",
      imageUrl: "/api/media/files/default-brand.png"
    });
    print("✔ Registered new Brand: " + trimmedName + " (slug: " + generatedSlug + ")");
    brandCount++;
  }
});

// 2. Process Categories
var distinctCategories = db.products.distinct('categoryIds');
var categoryCount = 0;

distinctCategories.forEach(function(catId) {
  if (!catId) return;
  var trimmedId = catId.trim();
  if (!trimmedId) return;

  // Check if category exists by ID or Slug or Name
  // Sometimes catId contains the actual MongoDB ObjectId string or slug
  var exists = db.categories.findOne({ 
    $or: [
      { _id: trimmedId },
      { slug: trimmedId.toLowerCase() },
      { name: { $regex: "^" + trimmedId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", $options: "i" } }
    ]
  });

  if (!exists) {
    var generatedName = trimmedId.charAt(0).toUpperCase() + trimmedId.slice(1);
    var generatedSlug = slugify(trimmedId);
    
    // Check slug uniqueness
    var slugExists = db.categories.findOne({ slug: generatedSlug });
    if (slugExists) {
      generatedSlug += "-" + Math.floor(Math.random() * 1000);
    }

    db.categories.insertOne({
      // If trimmedId is 24 chars long alphanum, it might be ObjectId. Let's just insert it as a normal string slug base category
      name: generatedName,
      slug: generatedSlug,
      icon: "📦",
      imageUrl: "/api/media/files/default-category.png"
    });
    print("✔ Registered new Category: " + generatedName + " (slug: " + generatedSlug + ")");
    categoryCount++;
  }
});

print("--- Execution Terminated ---");
print("Success: " + brandCount + " Brands registered.");
print("Success: " + categoryCount + " Categories registered.");
