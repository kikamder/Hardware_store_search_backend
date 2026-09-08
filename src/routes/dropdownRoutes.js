import { Router } from 'express';
import {
  CATEGORY_OPTIONS,
  SHOP_STATUS_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
} from '../constants/dropdownOptions.js';

const router = Router();

router.get('/categories', (req, res) => {
  res.status(200).json({ status: 'success', data: CATEGORY_OPTIONS });
});

router.get('/shop-statuses', (req, res) => {
  res.status(200).json({ status: 'success', data: SHOP_STATUS_OPTIONS });
});

router.get('/user-roles', (req, res) => {
  res.status(200).json({ status: 'success', data: USER_ROLE_OPTIONS });
});

router.get('/user-statuses', (req, res) => {
  res.status(200).json({ status: 'success', data: USER_STATUS_OPTIONS });
});

router.get('/product-statuses', (req, res) => {
  res.status(200).json({ status: 'success', data: PRODUCT_STATUS_OPTIONS });
});

export default router;