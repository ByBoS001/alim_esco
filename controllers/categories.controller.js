const db = require('../db');
const { productCategories } = require('../models/schema');
const { eq } = require('drizzle-orm');

const getCategories = async (req, res) => {
    try {
        const result = await db.select().from(productCategories);
        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error while fetching categories' });
    }
};

const createCategory = async (req, res) => {
    try {
        const { name } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const [newCategory] = await db.insert(productCategories).values({ name }).returning();
        res.status(201).json({ message: 'Category created successfully', data: newCategory });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Internal server error while creating category' });
    }
};

const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const [updatedCategory] = await db.update(productCategories)
            .set({ name })
            .where(eq(productCategories.id_category, Number(id)))
            .returning();

        if (!updatedCategory) return res.status(404).json({ error: 'Category not found' });
        res.status(200).json({ message: 'Category updated successfully', data: updatedCategory });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Internal server error while updating category' });
    }
};

const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const [deletedCategory] = await db.delete(productCategories)
            .where(eq(productCategories.id_category, Number(id)))
            .returning();

        if (!deletedCategory) return res.status(404).json({ error: 'Category not found' });
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Internal server error while deleting category' });
    }
};

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
