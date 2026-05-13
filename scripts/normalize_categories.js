// Connect to Database
const db = db.getSiblingDB('gtstore_catalog');

print("Starting Database Relational Hardening Migration...");

// 1. Repair Category Slugs (Ensure 'Cat1' slug matches legacy references to prevent orphans)
const cat1 = db.categories.findOne({ name: /^cat1$/i });
if (cat1) {
    print(`Found Cat1 category with current slug: '${cat1.slug}'`);
    db.categories.updateOne(
        { _id: cat1._id },
        { $set: { slug: 'cat1' } }
    );
    print("Successfully restored 'Cat1' slug to 'cat1' to align legacy product indices.");
}

// 2. Fetch all Category assets and create Slug/Name mapping
const categories = db.categories.find().toArray();
const categoryMap = {}; // Key: (Slug OR lowercase Name), Value: string ObjectId

categories.forEach(cat => {
    const idStr = cat._id.toString();
    categoryMap[cat.slug.toLowerCase()] = idStr;
    categoryMap[cat.name.toLowerCase()] = idStr;
    categoryMap[idStr] = idStr; // self-map for safety
});

print(`Loaded ${categories.length} categories into normalization memory.`);

// 3. Iterate through all products and map string/slug CategoryIDs to formal ObjectIds
const cursor = db.products.find({});
let updateCount = 0;

cursor.forEach(prod => {
    const rawIds = prod.categoryIds || [];
    const normalizedIds = [];
    let modified = false;

    rawIds.forEach(idRef => {
        const lookup = idRef.trim().toLowerCase();
        if (categoryMap[lookup]) {
            normalizedIds.push(categoryMap[lookup]);
            if (categoryMap[lookup] !== idRef) {
                modified = true;
            }
        } else {
            // Fallback if no category matches the slug at all - log it and retain
            print(`[Warning] Product '${prod.name}' references unrecognizable CategoryToken: '${idRef}'`);
            normalizedIds.push(idRef);
        }
    });

    // Deduplicate ids
    const uniqueIds = [...new Set(normalizedIds)];
    if (uniqueIds.length !== rawIds.length) {
        modified = true;
    }

    if (modified) {
        db.products.updateOne(
            { _id: prod._id },
            { $set: { categoryIds: uniqueIds } }
        );
        updateCount++;
    }
});

print(`Process Complete. Successfully normalized category references for ${updateCount} products.`);
