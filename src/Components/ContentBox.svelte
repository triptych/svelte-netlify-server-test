<script>
  import Product from "./Product.svelte";
  import { cart } from "../Store/store.js";

  export let products = [];

  let total = 0;

  cart.subscribe(c => {
    total = c;
  });

  const removeItem = () => cart.update(c => c - 1);
</script>

<style>
  .content-box {
    width: 100%;
    height: 100%;
    padding: 20px 10px;
    background-color: rgb(243, 240, 240);
    box-sizing: border-box;
  }
  .product-cotainer {
    display: flex;
  }
</style>

<div class="content-box">
  <h1>Product list</h1>
  <div class="cart">
    <h3>You have {total} products in the cart</h3>
    {#if total > 0}
      <a href="javascript:void(0)" on:click={removeItem}>
        Click to remove an item from cart
      </a>
    {/if}
  </div>
  <div class="product-cotainer">
    {#each products as product}
      <Product {product} />
    {/each}
  </div>
</div>
