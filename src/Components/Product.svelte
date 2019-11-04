<style>
  .product {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 300px;
    border: 1px solid gray;
    justify-content: center;
    align-items: center;
    padding: 10px;
    margin: 20px;
    text-align: center;
  }
  .product-info {
    color: grey;
  }
  .product-price p {
    color: #e7a8a8;
    font-size: 30px;
    margin: 0;
    border-bottom: 1px dotted;
    border-top: 1px dotted;
    font-weight: bold;
  }
  .addtocart button {
    background: #7bff7b;
    border: none;
    padding: 10px 25px;
    color: #235313;
    font-weight: 300;
    text-transform: uppercase;
    cursor: pointer;
    margin: 10px 0;
  }
  .addtocart button:hover {
    background: #1a631a;
    color: white;
 }
</style>

<script>
  import { cart } from '../Store/store.js'
  export let product = {}

  const setCart = () => cart.update(total => total + 1)
</script>

<div class="product">
  <picture>
    <img src={product.image} alt="" />
  </picture>
  <div class="product-info">
    <h1>{product.name}</h1>
    <h3>{product.description}</h3>
  </div>
  <div class="product-price">
    <p>{product.price}</p>
    {#if product.stock < 5}
      <strong>¡Hurry up!</strong>
    {/if}
  </div>
  <div class="addtocart">
    <button on:click={setCart}>Add to cart</button>
  </div>
</div>
