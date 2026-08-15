const db = require('../db');
const { productCatalog, productCategories } = require('../models/schema');
const { eq } = require('drizzle-orm');

const getProducts = async (req, res) => {
    try {
        const result = await db.select({
            id_product: productCatalog.id_product,
            name: productCatalog.name,
            id_category: productCatalog.id_category,
            category_name: productCategories.name
        })
            .from(productCatalog)
            .innerJoin(productCategories, eq(productCatalog.id_category, productCategories.id_category));

        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Internal server error while fetching products' });
    }
};

const createProduct = async (req, res) => {
    try {
        const { name, id_category } = req.body || {};
        if (!name || !id_category) return res.status(400).json({ error: 'Name and id_category are required' });

        const [newProduct] = await db.insert(productCatalog).values({ name, id_category }).returning();
        res.status(201).json({ message: 'Product created successfully', data: newProduct });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Internal server error while creating product' });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, id_category } = req.body || {};

        let updateData = {};
        if (name) updateData.name = name;
        if (id_category) updateData.id_category = id_category;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        const [updatedProduct] = await db.update(productCatalog)
            .set(updateData)
            .where(eq(productCatalog.id_product, Number(id)))
            .returning();

        if (!updatedProduct) return res.status(404).json({ error: 'Product not found' });
        res.status(200).json({ message: 'Product updated successfully', data: updatedProduct });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Internal server error while updating product' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const [deletedProduct] = await db.delete(productCatalog)
            .where(eq(productCatalog.id_product, Number(id)))
            .returning();

        if (!deletedProduct) return res.status(404).json({ error: 'Product not found' });
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Internal server error while deleting product' });
    }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };
