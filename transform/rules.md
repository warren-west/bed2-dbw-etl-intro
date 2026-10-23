Product Rules:
1. If a product's parent category is `null`, replace it with "No parent category defined".
2. If a product's unit price is `null`, reject the product.

Customer Rules:
1. Check email for validation.
    - Contains an "@"
    - Contains strings before and after "@"
    - If the email is invalid - replace it with "No email provided"
