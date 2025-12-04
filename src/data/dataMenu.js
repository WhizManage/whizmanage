import { Container, FolderCog, LayoutDashboard, ShoppingBasket, ShoppingCart, Store, Tag, Truck } from "lucide-react";

const dataMenuTop=[
    // {
    //     name:"Dashboard",
    //     link:"",
    //     svgIn:<LayoutDashboard size={20} strokeWidth={1.5} />,
    //     svgOut:<LayoutDashboard size={20} strokeWidth={1.5} />,
    //     visible:false
    // },
    {
        name:"Products",
        link:window.siteUrl+'/wp-admin/admin.php?page=whizmanage',
        svgIn:<ShoppingBasket size={20} strokeWidth={2.2} />,
        svgOut:<ShoppingBasket size={20} strokeWidth={2.2} />,
        visible:true
    },
    {
        name:"Coupons",
        link:window.siteUrl+"/wp-admin/admin.php?page=whizmanage-coupons",
        svgIn:<Tag size={20} strokeWidth={2.2} />,
        svgOut:<Tag size={20} strokeWidth={2.2} />,
        visible:true
    },
    // {
    //     name:"Orders",
    //     link:window.siteUrl+"/wp-admin/admin.php?page=whizmanage-orders",
    //     svgIn:<ShoppingCart size={20} strokeWidth={1.5} />,
    //     svgOut:<ShoppingCart size={20} strokeWidth={1.5} />,
    //     visible:true
    // },
    // {
    //     name:"tests",
    //     link:window.siteUrl+"/wp-admin/admin.php?page=whizmanage-tests",
    //     svgIn:<Truck size={20} strokeWidth={1.5} />,
    //     svgOut:<Truck size={20} strokeWidth={1.5} />,
    //     visible:true
    // },

]
const dataMenuMiddle=[
    {
        name:"Show Store",
        link:"/shop/",
        svgIn:<Store size={20} strokeWidth={2.2} />
    },
    {
        name:"WordPress control panel",
        link:"/wp-admin/",
        svgIn:<FolderCog size={20} strokeWidth={2.2} />
    },
]
export{dataMenuTop,dataMenuMiddle}