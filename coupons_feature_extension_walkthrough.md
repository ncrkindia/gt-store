# Premium Coupons & Vouchers Feature Expansion

We have successfully implemented the requested end-to-end coupons and vouchers extension for the GT Store platform. Both user-facing portals (the dedicated account **My Coupons** manager and the checkout **Direct-Apply Coupon Selector**) are now online and fully verified. 

---

## 🚀 Key Improvements

### 1. User Dashboard: "My Coupons" Page (`Coupons.tsx`)
A brand new subpage has been built inside the customer account panel at `/account/coupons`.
*   **Visual Ticket Design**: Styled using a premium dual-color gradient ticket banner, glassmorphic layout cards, and dashed coupon ticket notches.
*   **Intelligent Copy-to-Clipboard**: Fully responsive action buttons that copy the promo code to the system clipboard and display instant, stylish toast notifications.
*   **Human-Friendly Descriptions**: Translates complex database structures (e.g., `discountType`, `maxDiscountCap`, `minOrderValue`, `applicableUserIds`, and `isRefundCompensation`) into clean, conversational statements.
*   **Active vs Archived Filter**: Displays currently active promotional offers at the top and lists archived/expired vouchers in a faded, line-through state at the bottom.

### 2. Shopping Cart: Direct-Apply Coupon Selector (`Cart.tsx`)
An interactive available coupon drawer has been added directly inside the cart summary section.
*   **Best 5 Algorithm**: Evaluates active coupons, calculates potential customer savings in real-time, sorts them by maximum savings descending, and presents the **Best 5** recommendations by default.
*   **"+ More" Expander**: Hides additional options under an elegant toggle to prevent visual clutter in compact screens.
*   **Unified Client-Side Validator**: Runs a full pre-check mimicking the Java backend (`PromotionService.java`) for dates, user restriction lists, minimum subtotal requirements, and item quantity boundaries.
*   **Click-to-Apply Selector**: Applies the clicked coupon directly with visual highlights (`border-emerald-500` & `bg-emerald-50/30`), switching the button state dynamically to `Applied`.
*   **Hover Tooltips**: Highlights exact eligibility details on hover/click of the custom `Info` icon (e.g., displaying `Add ₹X more to qualify` when the subtotal is below the threshold).

### 3. Admin Console: Coupon Search Option (`CouponsPage.tsx`)
A new search functionality has been introduced directly inside the **Coupons & Promos** admin management dashboard.
*   **Multi-Criteria Search**: Admin users can now search active/inactive coupons by their promotional code, discount type description, allowed product ID strings, or target user email lists.
*   **Dynamic Results Badge**: An elegant UI counter displays how many promo campaigns match the current active search query in real-time.
*   **Clear Button Integration**: A responsive cross (`X`) button instantly clears search filters.
*   **Fallbacks & States**: Renders beautiful, informative tables with contextual feedback when no coupons match the requested queries.

### 4. Store Refund & Compensation Automated Generation (Rule D)
Designated store refund and compensation coupons now feature premium auto-generation rules ensuring uniqueness and strict compliance:
*   **Alphanumeric 16-Character Unique Generation**: Codes are generated automatically using a random alphanumeric set.
*   **Strict Prefixing**: Code strings strictly start with the `TA` prefix (e.g. `TA38FG7W9Q1PL82S`).
*   **Case Enforcement**: Code characters are strictly converted to `UPPERCASE` only.
*   **Double Layer Security**: Handled natively on the React frontend Dialog Form and reinforced in the Spring Boot Hibernate backend layer.

### 5. Single / Multi-Use & Cooling Periods User Restriction Policies
*   **User Usage Options**: Admin users can flag coupons with customizable usage constraints:
    *   `UNLIMITED`: Unlimited use (reusable sitewide campaign)
    *   `ONCE_LIFESPAN`: Single use per customer profile in lifespan
    *   `ONCE_DAILY`: Single use per customer per day (24h cooldown)
    *   `ONCE_WEEKLY`: Single use per customer per week (7d cooldown)
    *   `ONCE_MONTHLY`: Single use per customer per month (30d cooldown)
*   **Backend Enforced Checking**: The Spring Boot backend dynamically queries order history using JPA repository checking to ensure constraints are respected upon voucher validation.
*   **Shopper UI Visibility**: The shopper dashboard displays these cooling/lifespan rules directly on the active ticket details.

### 6. Non-Editable Store Refund Rules
*   **Freeze-on-Create Safety**: Refund/compensation vouchers are completely protected after generation.
*   **Toggle-Only Operations**: Admins can exclusively toggle active/inactive status. All edit input fields are securely locked/disabled during edit mode.

---

## 🛠️ File Changes & Integrations

### 1. Spring Boot Backend: Entity & Validation Constraints
*   **Coupon.java** was updated with the `usagePolicy` column.
*   **OrderRepository.java** was enriched with custom JPA queries to query order history.
*   **PromotionService.java** evaluates history on checkout validation:
```java
        // User Usage Policy Check
        if (coupon.getUsagePolicy() != null && !coupon.getUsagePolicy().equalsIgnoreCase("UNLIMITED")) {
            String policy = coupon.getUsagePolicy().toUpperCase();
            if (policy.equals("ONCE_LIFESPAN")) {
                List<Order> orders = orderRepository.findByUserIdAndCouponCodeIgnoreCaseAndStatusNot(userId, coupon.getCode(), "CANCELLED");
                if (!orders.isEmpty()) return false;
            } else if (policy.equals("ONCE_DAILY")) {
                LocalDateTime since = LocalDateTime.now().minusDays(1);
                List<Order> orders = orderRepository.findByUserIdAndCouponCodeIgnoreCaseAndStatusNotAndCreatedAtAfter(userId, coupon.getCode(), "CANCELLED", since);
                if (!orders.isEmpty()) return false;
            }
            // Additional weekly and monthly checks...
        }
```

### 2. Admin Dashboard Form: User Usage Restrictions Dropdown & Locking (`CouponsPage.tsx`)
*   Added `usagePolicy` form state.
*   Implemented `isRefundEditDisabled = isEdit && isRefundCompensation` block to lock editing inputs.
*   Added the premium layout select control:
```typescript
                            <div className="flex flex-col space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">User Usage Restriction Policy</label>
                                <select 
                                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-slate-800"
                                    value={usagePolicy}
                                    onChange={e => setUsagePolicy(e.target.value)}
                                    disabled={isRefundEditDisabled}
                                >
                                    <option value="UNLIMITED">Unlimited Use (Standard reusable promotion)</option>
                                    <option value="ONCE_LIFESPAN">Single Use by User (Once in lifespan of coupon)</option>
                                    <option value="ONCE_DAILY">Single Use per User per Day (24-hour cooling window)</option>
                                    <option value="ONCE_WEEKLY">Single Use per User per Week (7-day cooling window)</option>
                                    <option value="ONCE_MONTHLY">Single Use per User per Month (30-day cooling window)</option>
                                </select>
                            </div>
```

---

## 🎯 Verification Results
*   **Storefront Web App Build**: Completed successfully with **Exit Code 0** (no errors).
*   **Admin Dashboard Build**: Completed successfully with **Exit Code 0** (no errors).
*   **Spring Boot Compilation**: Compiled clean (`mvn clean compile`) with **BUILD SUCCESS**.
