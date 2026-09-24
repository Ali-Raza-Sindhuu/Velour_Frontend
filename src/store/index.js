import { configureStore } from "@reduxjs/toolkit";
import uiReducer from './slice/Uislice.js'
import authReducer from '../features/auth/authSlice.js'
import cartReducer from '../features/cart/cartSlice.js'
import productsReducer from '../features/products/productsSlice.js'
import wishlistReducer from '../features/wishlist/wishlistSlice.js'
import ordersReducer from '../features/orders/ordersSlice.js'
import siteReducer from '../features/site/siteSlice.js'
import userReducer from '../api/user/userSlice.js'

export const store = configureStore({
    reducer : {
        ui : uiReducer,
        auth : authReducer,
        cart : cartReducer,
        products : productsReducer,
        wishlist : wishlistReducer,
        orders : ordersReducer,
        site: siteReducer,
        user: userReducer
    }
})
