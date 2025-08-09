import { createRouter, createWebHistory } from "vue-router";
import Home from "@/pages/Home.vue";
import Login from "@/pages/Login.vue";
import CreateAuction from "@/pages/CreateAuction.vue";
import AuctionDetail from "@/pages/AuctionDetail.vue";
import AdminDashboard from "@/pages/AdminDashboard.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/login", component: Login },
    { path: "/create", component: CreateAuction },
    { path: "/admin", component: AdminDashboard },
    { path: "/auction/:id", component: AuctionDetail }, // NEW
  ],
});
