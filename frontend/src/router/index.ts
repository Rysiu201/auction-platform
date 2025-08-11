import { createRouter, createWebHistory } from "vue-router";
import Home from "@/pages/Home.vue";
import Auctions from "@/pages/Auctions.vue";
import Info from "@/pages/Info.vue";
import Contact from "@/pages/Contact.vue";
import Login from "@/pages/Login.vue";
import AuctionDetail from "@/pages/AuctionDetail.vue";
import AdminDashboard from "@/pages/AdminDashboard.vue";
import CreateAuction from "@/pages/CreateAuction.vue";
import AdminSettings from "@/pages/AdminSettings.vue";
import MyAuctions from "@/pages/MyAuctions.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/auctions", component: Auctions },
    { path: "/info", component: Info },
    { path: "/contact", component: Contact },
    { path: "/login", component: Login },
    { path: "/admin/create", component: CreateAuction },
    { path: "/admin/settings", component: AdminSettings },
    { path: "/admin", component: AdminDashboard },
    { path: "/auction/:id", component: AuctionDetail },
    { path: "/my-auctions", component: MyAuctions },
  ],
});
