import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from decimal import Decimal
from beanie import PydanticObjectId

from app.main import app
from app.core.database import init_db
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.quotation import Quotation, QuotationItem
from app.models.inventory import FulfillmentOrder, FulfillmentItem
from app.models.audit import AuditLog

@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    await init_db()
    yield

def auth_headers(user: User) -> dict:
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_acceptance_suite():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        uid = uuid.uuid4().hex[:6]

        # ----------------------------------------------------
        # SETUP: Create Super Admin fixture
        # ----------------------------------------------------
        admin_user = User(
            name="Platform Super Admin",
            email=f"superadmin_{uid}@test.com",
            password_hash=get_password_hash("pass123"),
            role="super_admin",
            permissions=["*"],
            status="ACTIVE"
        )
        await admin_user.insert()
        admin_hdr = auth_headers(admin_user)

        # ----------------------------------------------------
        # TEST 1: Admin creates Seller A
        # ----------------------------------------------------
        res_seller_a = await ac.post("/api/v1/users/", json={
            "name": f"Seller Alpha Org {uid}",
            "email": f"seller_alpha_{uid}@test.com",
            "password": "password123",
            "role": "seller",
            "company_name": "Alpha Corp"
        }, headers=admin_hdr)
        assert res_seller_a.status_code == 200, res_seller_a.text
        seller_a_data = res_seller_a.json()["data"]
        seller_a_id = seller_a_data["id"]
        seller_a_user = await User.get(PydanticObjectId(seller_a_id))
        seller_a_hdr = auth_headers(seller_a_user)
        print("\n[PASS] TEST 1 PASSED: Admin successfully created Seller A")

        # ----------------------------------------------------
        # TEST 2: Admin creates Seller B
        # ----------------------------------------------------
        res_seller_b = await ac.post("/api/v1/users/", json={
            "name": f"Seller Beta Org {uid}",
            "email": f"seller_beta_{uid}@test.com",
            "password": "password123",
            "role": "seller",
            "company_name": "Beta Corp"
        }, headers=admin_hdr)
        assert res_seller_b.status_code == 200, res_seller_b.text
        seller_b_data = res_seller_b.json()["data"]
        seller_b_id = seller_b_data["id"]
        seller_b_user = await User.get(PydanticObjectId(seller_b_id))
        seller_b_hdr = auth_headers(seller_b_user)
        print("[PASS] TEST 2 PASSED: Admin successfully created Seller B")

        # ----------------------------------------------------
        # TEST 3: Seller A creates Employee A1 (Sales Rep)
        # ----------------------------------------------------
        res_emp_a1 = await ac.post("/api/v1/users/", json={
            "name": "Employee A1",
            "email": f"employee_a1_{uid}@test.com",
            "password": "password123",
            "role": "sales_rep"
        }, headers=seller_a_hdr)
        assert res_emp_a1.status_code == 200, res_emp_a1.text
        emp_a1_data = res_emp_a1.json()["data"]
        assert emp_a1_data["seller_id"] == seller_a_id
        emp_a1_user = await User.get(PydanticObjectId(emp_a1_data["id"]))
        emp_a1_hdr = auth_headers(emp_a1_user)
        print("[PASS] TEST 3 PASSED: Seller A created Employee A1 bound to Seller A")

        # Also create Sales Manager A, Finance A, and Ops A for Seller A
        res_mgr_a = await ac.post("/api/v1/users/", json={
            "name": "Manager A",
            "email": f"manager_a_{uid}@test.com",
            "password": "password123",
            "role": "sales_manager"
        }, headers=seller_a_hdr)
        assert res_mgr_a.status_code == 200
        mgr_a_user = await User.get(PydanticObjectId(res_mgr_a.json()["data"]["id"]))
        mgr_a_hdr = auth_headers(mgr_a_user)

        res_fin_a = await ac.post("/api/v1/users/", json={
            "name": "Finance A",
            "email": f"finance_a_{uid}@test.com",
            "password": "password123",
            "role": "finance"
        }, headers=seller_a_hdr)
        assert res_fin_a.status_code == 200
        fin_a_user = await User.get(PydanticObjectId(res_fin_a.json()["data"]["id"]))
        fin_a_hdr = auth_headers(fin_a_user)

        res_ops_a = await ac.post("/api/v1/users/", json={
            "name": "Ops A",
            "email": f"ops_a_{uid}@test.com",
            "password": "password123",
            "role": "operations"
        }, headers=seller_a_hdr)
        assert res_ops_a.status_code == 200
        ops_a_user = await User.get(PydanticObjectId(res_ops_a.json()["data"]["id"]))
        ops_a_hdr = auth_headers(ops_a_user)

        # ----------------------------------------------------
        # TEST 4: Seller B creates Employee B1
        # ----------------------------------------------------
        res_emp_b1 = await ac.post("/api/v1/users/", json={
            "name": "Employee B1",
            "email": f"employee_b1_{uid}@test.com",
            "password": "password123",
            "role": "sales_rep"
        }, headers=seller_b_hdr)
        assert res_emp_b1.status_code == 200, res_emp_b1.text
        emp_b1_data = res_emp_b1.json()["data"]
        assert emp_b1_data["seller_id"] == seller_b_id
        emp_b1_user = await User.get(PydanticObjectId(emp_b1_data["id"]))
        emp_b1_hdr = auth_headers(emp_b1_user)
        print("[PASS] TEST 4 PASSED: Seller B created Employee B1 bound to Seller B")

        # ----------------------------------------------------
        # Create fixtures: Customer and Quotation for Seller B
        # ----------------------------------------------------
        cust_b = Customer(
            name="Beta Client Co",
            email=f"client_b_{uid}@beta.com",
            customer_tier="STANDARD",
            seller_id=seller_b_id
        )
        await cust_b.insert()

        prod_b = Product(
            name="Beta Widget",
            sku=f"BETA-WIDGET-{uid}",
            base_price=Decimal("100.00"),
            seller_id=seller_b_id
        )
        await prod_b.insert()

        quote_b = Quotation(
            quotation_number=f"QT-BETA-{uid}",
            customer=cust_b,
            sales_rep=emp_b1_user,
            seller_id=seller_b_id,
            status="DRAFT"
        )
        await quote_b.insert()

        # ----------------------------------------------------
        # TEST 5: Employee A1 attempts to access Seller B's quotation -> RESULT: 403 Forbidden
        # ----------------------------------------------------
        res_cross_quote = await ac.get(f"/api/v1/quotations/{quote_b.id}", headers=emp_a1_hdr)
        assert res_cross_quote.status_code == 403, f"Expected 403, got {res_cross_quote.status_code}: {res_cross_quote.text}"
        print("[PASS] TEST 5 PASSED: Employee A1 received 403 Forbidden when accessing Seller B's quotation")

        # ----------------------------------------------------
        # Create product & customer for Seller A for quote tests
        # ----------------------------------------------------
        cust_a = Customer(
            name="Alpha Client Corp",
            email=f"client_a_{uid}@alpha.com",
            customer_tier="STANDARD", # standard limit is 5%
            seller_id=seller_a_id
        )
        await cust_a.insert()

        prod_a = Product(
            name="Alpha Server",
            sku=f"ALPHA-SRV-{uid}",
            base_price=Decimal("1000.00"),
            seller_id=seller_a_id
        )
        await prod_a.insert()

        # ----------------------------------------------------
        # TEST 6: Sales Rep creates quotation with excessive discount -> RESULT: Automatically routed to Sales Manager
        # ----------------------------------------------------
        create_q_res = await ac.post("/api/v1/quotations/", json={"customer_id": str(cust_a.id)}, headers=emp_a1_hdr)
        assert create_q_res.status_code == 200
        quote_a_id = create_q_res.json()["data"]["id"]

        # Add item with moderate excessive discount: 8% (STANDARD tier limit is 5%)
        add_item_res = await ac.post(f"/api/v1/quotations/{quote_a_id}/items", json={
            "product_id": str(prod_a.id),
            "quantity": 2,
            "discount_percent": 8.0
        }, headers=emp_a1_hdr)
        assert add_item_res.status_code == 200

        # Submit quote
        submit_res = await ac.post(f"/api/v1/quotations/{quote_a_id}/submit", headers=emp_a1_hdr)
        assert submit_res.status_code == 200
        submitted_quote = submit_res.json()["data"]
        assert submitted_quote["status"] == "PENDING_APPROVAL"
        assert submitted_quote["approval_level"] == "SALES_MANAGER"

        # Check approval queue has entry for Sales Manager
        approvals_res = await ac.get("/api/v1/approvals/", headers=mgr_a_hdr)
        assert approvals_res.status_code == 200
        mgr_pending = approvals_res.json()["data"]
        matching_approvals = [ap for ap in mgr_pending if ap["quotation_id"] == quote_a_id]
        assert len(matching_approvals) > 0
        approval_id = matching_approvals[0]["id"]
        print("[PASS] TEST 6 PASSED: Quotation with excessive discount automatically routed to Sales Manager")

        # ----------------------------------------------------
        # TEST 7: Sales Rep attempts to approve own quotation -> RESULT: 403 Forbidden
        # ----------------------------------------------------
        res_self_approve = await ac.post(f"/api/v1/approvals/{approval_id}/act", json={
            "action": "APPROVE",
            "reason": "I approve my own discount"
        }, headers=emp_a1_hdr)
        assert res_self_approve.status_code == 403, f"Expected 403, got {res_self_approve.status_code}: {res_self_approve.text}"
        print("[PASS] TEST 7 PASSED: Sales Rep received 403 Forbidden when attempting to approve own quotation")

        # ----------------------------------------------------
        # TEST 8: High-risk quotation requires Finance -> Sales Manager approval -> Finance approval
        # ----------------------------------------------------
        hr_quote_res = await ac.post("/api/v1/quotations/", json={"customer_id": str(cust_a.id)}, headers=emp_a1_hdr)
        assert hr_quote_res.status_code == 200
        hr_quote_id = hr_quote_res.json()["data"]["id"]

        await ac.post(f"/api/v1/quotations/{hr_quote_id}/items", json={
            "product_id": str(prod_a.id),
            "quantity": 5,
            "discount_percent": 50.0
        }, headers=emp_a1_hdr)

        hr_submit = await ac.post(f"/api/v1/quotations/{hr_quote_id}/submit", headers=emp_a1_hdr)
        assert hr_submit.status_code == 200
        assert hr_submit.json()["data"]["approval_level"] == "FINANCE"
        assert hr_submit.json()["data"]["status"] == "PENDING_APPROVAL"

        # 1. Sales Manager views and approves Level 1
        mgr_apps = await ac.get("/api/v1/approvals/", headers=mgr_a_hdr)
        hr_mgr_app = next(a for a in mgr_apps.json()["data"] if a["quotation_id"] == hr_quote_id)
        
        act_mgr = await ac.post(f"/api/v1/approvals/{hr_mgr_app['id']}/act", json={
            "action": "APPROVE",
            "reason": "Manager approved, forwarding to Finance"
        }, headers=mgr_a_hdr)
        assert act_mgr.status_code == 200

        # Quote should STILL be PENDING_APPROVAL awaiting Finance
        q_after_mgr = await ac.get(f"/api/v1/quotations/{hr_quote_id}", headers=mgr_a_hdr)
        assert q_after_mgr.json()["data"]["status"] == "PENDING_APPROVAL"

        # 2. Finance sees the Level 2 approval in their queue
        fin_apps = await ac.get("/api/v1/approvals/", headers=fin_a_hdr)
        hr_fin_app = next(a for a in fin_apps.json()["data"] if a["quotation_id"] == hr_quote_id)
        assert hr_fin_app["level"] == 2 # FINANCE

        # 3. Finance approves
        act_fin = await ac.post(f"/api/v1/approvals/{hr_fin_app['id']}/act", json={
            "action": "APPROVE",
            "reason": "Finance approves high-risk margin"
        }, headers=fin_a_hdr)
        assert act_fin.status_code == 200

        # Now quotation must be APPROVED!
        q_final = await ac.get(f"/api/v1/quotations/{hr_quote_id}", headers=fin_a_hdr)
        assert q_final.json()["data"]["status"] == "APPROVED"
        print("[PASS] TEST 8 PASSED: High-risk quotation successfully required Sales Manager -> Finance multi-tier approval")

        # ----------------------------------------------------
        # TEST 9: Customer signs up -> Customer role automatically assigned
        # ----------------------------------------------------
        res_signup = await ac.post("/api/v1/auth/signup", json={
            "name": "Public Customer",
            "email": f"customer_public_{uid}@test.com",
            "password": "Password123!",
            "role": "admin" # Attacker attempts to request admin role
        })
        assert res_signup.status_code == 200, res_signup.text
        cust_signup_data = res_signup.json()["data"]
        assert cust_signup_data["role"] == "customer"
        assert cust_signup_data["seller_id"] is None
        print("[PASS] TEST 9 PASSED: Public sign-up automatically and strictly assigned 'customer' role, ignoring client attempt to claim admin")

        # ----------------------------------------------------
        # TEST 10: Customer attempts to access Admin dashboard / internal APIs -> RESULT: 403 Forbidden
        # ----------------------------------------------------
        cust_user = await User.find_one({"email": f"customer_public_{uid}@test.com"})
        cust_hdr = auth_headers(cust_user)
        res_admin_api = await ac.get("/api/v1/users/", headers=cust_hdr)
        assert res_admin_api.status_code == 403, f"Expected 403, got {res_admin_api.status_code}"
        print("[PASS] TEST 10 PASSED: Customer received 403 Forbidden when attempting to access internal user management API")

        # ----------------------------------------------------
        # TEST 11: Customer negotiates discount beyond threshold -> RESULT: Quotation automatically re-enters approval flow
        # ----------------------------------------------------
        approved_quote = Quotation(
            quotation_number=f"QT-APPROVED-{uid}",
            customer=cust_a,
            sales_rep=emp_a1_user,
            seller_id=seller_a_id,
            status="APPROVED",
            items=[
                QuotationItem(
                    product=prod_a,
                    quantity=1,
                    unit_price=Decimal("1000.00"),
                    discount=Decimal("0.0"),
                    total_price=Decimal("1000.00")
                )
            ]
        )
        await approved_quote.insert()

        cust_client_user = User(
            name="Alpha Client Corp",
            email=f"client_a_{uid}@alpha.com",
            password_hash=get_password_hash("pass"),
            role="customer"
        )
        await cust_client_user.insert()
        cust_client_hdr = auth_headers(cust_client_user)

        res_negotiate = await ac.post(f"/api/v1/portal/quotation/{approved_quote.id}/negotiate", json={
            "notes": "Can we get 25% off for annual contract?",
            "counter_discount_percent": 25.0
        }, headers=cust_client_hdr)
        assert res_negotiate.status_code == 200, res_negotiate.text
        assert res_negotiate.json()["data"]["status"] == "PENDING_APPROVAL"
        print("[PASS] TEST 11 PASSED: Customer negotiated discount beyond ceiling -> Quotation automatically re-entered approval flow")

        # ----------------------------------------------------
        # TEST 12: Operations manually overrides warehouse split -> RESULT: Action recorded in audit log
        # ----------------------------------------------------
        fo = FulfillmentOrder(
            order_number=f"FO-APX-{uid}",
            seller_id=seller_a_id,
            product_name="Alpha Server",
            quantity_to_deliver=2,
            status="READY_FOR_DELIVERY",
            items=[
                FulfillmentItem(
                    product_name="Alpha Server",
                    quantity=2,
                    warehouse_name="East Coast Warehouse"
                )
            ]
        )
        await fo.insert()

        res_override = await ac.post(f"/api/v1/fulfillment/orders/{fo.id}/override", json={
            "warehouse_name": "West Coast Warehouse",
            "reason": "Stock rebalance requested by logistics team"
        }, headers=ops_a_hdr)
        assert res_override.status_code == 200, res_override.text

        audit_record = await AuditLog.find_one({
            "action": "WAREHOUSE_OVERRIDE",
            "resource_id": str(fo.id)
        })
        assert audit_record is not None
        assert audit_record.new_value == "West Coast Warehouse"
        assert audit_record.reason == "Stock rebalance requested by logistics team"
        print("[PASS] TEST 12 PASSED: Operations manually overridden warehouse split and audit log recorded")

        # ----------------------------------------------------
        # TEST 13: Seller A attempts to access Seller B's employee -> RESULT: 403 Forbidden / Not found
        # ----------------------------------------------------
        res_cross_emp = await ac.get(f"/api/v1/users/{emp_b1_user.id}", headers=seller_a_hdr)
        assert res_cross_emp.status_code in [403, 404], f"Expected 403 or 404, got {res_cross_emp.status_code}: {res_cross_emp.text}"
        print("[PASS] TEST 13 PASSED: Seller A received 403 Forbidden when attempting to access Seller B's employee")

        # ----------------------------------------------------
        # TEST 14: Employee tries to change their own role to Admin -> RESULT: 403 Forbidden
        # ----------------------------------------------------
        res_self_escalate = await ac.put(f"/api/v1/users/{emp_a1_user.id}", json={
            "role": "super_admin"
        }, headers=emp_a1_hdr)
        assert res_self_escalate.status_code == 403, f"Expected 403, got {res_self_escalate.status_code}: {res_self_escalate.text}"
        print("[PASS] TEST 14 PASSED: Employee received 403 Forbidden when attempting to escalate own role to super_admin")

        print("\n=======================================================")
        print("SUCCESS: ALL 14 ACCEPTANCE TESTS PASSED SUCCESSFULLY!")
        print("=======================================================\n")
