import { Link } from "react-router";
import { Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { mockOrders } from "../../data/mockData";

export function Orders() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "text-green-600 bg-green-50";
      case "shipped":
        return "text-blue-600 bg-blue-50";
      case "processing":
        return "text-yellow-600 bg-yellow-50";
      case "cancelled":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-5 h-5" />;
      case "shipped":
        return <Truck className="w-5 h-5" />;
      case "processing":
        return <Package className="w-5 h-5" />;
      case "cancelled":
        return <XCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-xl mb-6">My Orders</h2>

        {mockOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">You haven't placed any orders yet</p>
            <Link
              to="/"
              className="inline-block bg-[#2874f0] text-white px-6 py-2 rounded hover:bg-[#1c5ccc] transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mockOrders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
              >
                {/* Order Header */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Order ID</p>
                      <p className="font-medium">{order.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Date</p>
                      <p className="font-medium">{new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="font-medium">${order.total}</p>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full capitalize ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusIcon(order.status)}
                    <span>{order.status}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex gap-4">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded border border-gray-200"
                        />
                        <div className="flex-1">
                          <Link
                            to={`/product/${item.product.id}`}
                            className="hover:text-[#2874f0] transition"
                          >
                            <h4 className="mb-1">{item.product.name}</h4>
                          </Link>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                          <p className="text-sm mt-1">${item.product.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex gap-3">
                    {order.status === "delivered" && (
                      <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-sm">
                        Review Product
                      </button>
                    )}
                    {order.status === "shipped" && (
                      <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition text-sm">
                        Track Order
                      </button>
                    )}
                    {order.status === "processing" && (
                      <button className="px-4 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition text-sm">
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
