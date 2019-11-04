<script>
  import Header from "../Components/Header.svelte";
  import ContentBox from "../Components/ContentBox.svelte";
  import productsJson from "../products.js";
  import { onMount } from "svelte";

  let products;

  onMount(() => {
    products = productsJson;
  });
</script>

<div class="container-home">
  <Header />
  <ContentBox {products} />
</div>
