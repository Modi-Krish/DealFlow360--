from typing import List
from fastapi import APIRouter, Depends
from app.core.dependencies import require_role
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.schemas.common import StandardResponse
from app.models.user import UserRole

router = APIRouter()

def doc_to_response(doc: Customer) -> CustomerResponse:
    data = doc.model_dump()
    data['id'] = str(doc.id)
    return CustomerResponse(**data)

@router.get("/", response_model=StandardResponse[List[CustomerResponse]])
async def get_customers():
    customers = await Customer.find_all().to_list()
    return StandardResponse(success=True, message="Customers retrieved", data=[doc_to_response(c) for c in customers])

@router.post("/", response_model=StandardResponse[CustomerResponse])
async def create_customer(customer: CustomerCreate, current_user = Depends(require_role([UserRole.ADMIN, UserRole.SALES_REP]))):
    new_cust = Customer(**customer.model_dump())
    await new_cust.insert()
    return StandardResponse(success=True, message="Customer created", data=doc_to_response(new_cust))
