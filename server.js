const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


// ===============================
// TEST
// ===============================

app.get("/api/test", (req, res) => {
    res.json({
        message: "Urban Threads backend is working!"
    });
});


// ===============================
// PRODUCTS
// ===============================

// Get all products
app.get("/api/products", (req, res) => {

    const products = db
        .prepare("SELECT * FROM products ORDER BY id DESC")
        .all();

    res.json(products);
});


// Add product
app.post("/api/products", (req, res) => {

    const {
        name,
        price,
        category,
        image,
        description
    } = req.body;

    if (!name || !price || !category) {

        return res.status(400).json({
            error: "Name, price and category are required."
        });

    }

    const result = db.prepare(`
        INSERT INTO products
        (name, price, category, image, description)
        VALUES (?, ?, ?, ?, ?)
    `).run(
        name,
        Number(price),
        category,
        image || "",
        description || ""
    );

    res.json({
        message: "Product added successfully!",
        productId: result.lastInsertRowid
    });

});


// Delete product
app.delete("/api/products/:id", (req, res) => {

    const id = Number(req.params.id);

    db.prepare(
        "DELETE FROM products WHERE id = ?"
    ).run(id);

    res.json({
        message: "Product deleted successfully!"
    });

});


// ===============================
// ORDERS
// ===============================

// Create order
app.post("/api/orders", (req, res) => {

    const {
        customer_name,
        phone,
        location,
        total,
        items
    } = req.body;


    if (
        !customer_name ||
        !phone ||
        !total ||
        !items ||
        !items.length
    ) {

        return res.status(400).json({
            error: "Please provide customer details and cart items."
        });

    }


    const createOrder = db.transaction(() => {

        const order = db.prepare(`
            INSERT INTO orders
            (
                customer_name,
                phone,
                location,
                total,
                status
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            customer_name,
            phone,
            location || "",
            Number(total),
            "Pending Payment"
        );


        const orderId = order.lastInsertRowid;


        const insertItem = db.prepare(`
            INSERT INTO order_items
            (
                order_id,
                product_id,
                product_name,
                price,
                quantity
            )
            VALUES (?, ?, ?, ?, ?)
        `);


        for (const item of items) {

            insertItem.run(
                orderId,
                item.product_id,
                item.product_name,
                Number(item.price),
                Number(item.quantity || 1)
            );

        }


        return orderId;

    });


    try {

        const orderId = createOrder();


        res.json({

            message: "Order created successfully!",

            orderId: orderId,

            status: "Pending Payment"

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Could not create order."
        });

    }

});


// ===============================
// GET ORDERS
// ===============================

app.get("/api/orders", (req, res) => {

    const orders = db
        .prepare(`
            SELECT *
            FROM orders
            ORDER BY id DESC
        `)
        .all();

    res.json(orders);

});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log(
        `Urban Threads is running at http://localhost:${PORT}`
    );

});