import createNodeHelpers from 'gatsby-node-helpers'
import { tap } from 'lodash/fp'
import { createRemoteFileNode } from 'gatsby-source-filesystem'

// Node prefix
const TYPE_PREFIX = 'Shopify'

// Node types
const ARTICLE = 'Article'
const BLOG = 'Blog'
const COLLECTION = 'Collection'
const PRODUCT = 'Product'
const PRODUCT_OPTION = 'ProductOption'
const PRODUCT_VARIANT = 'ProductVariant'
const SHOP_POLICY = 'ShopPolicy'

const { createNodeFactory, generateNodeId } = createNodeHelpers({
  typePrefix: TYPE_PREFIX,
})

const downloadImage = async (
  { id, url },
  { createNode, touchNode, store, cache },
) => {
  let fileNodeID

  const mediaDataCacheKey = `${TYPE_PREFIX}__Media__${url}`
  const cacheMediaData = await cache.get(mediaDataCacheKey)

  if (cacheMediaData) {
    fileNodeID = cacheMediaData.fileNodeID
    touchNode(fileNodeID)
    return fileNodeID
  }

  const fileNode = await createRemoteFileNode({ url, store, cache, createNode })

  if (fileNode) {
    fileNodeID = fileNode.id
    await cache.set(mediaDataCacheKey, { fileNodeID })
    return fileNodeID
  }

  return undefined
}

export const ArticleNode = imageArgs =>
  createNodeFactory(ARTICLE, async node => {
    if (node.blog) node.blog___NODE = generateNodeId(BLOG, node.blog.id)

    if (node.image)
      node.image.localFile___NODE = await downloadImage(
        { id: node.image.id, url: node.image.src },
        imageArgs,
      )

    return node
  })

export const BlogNode = imageArgs => createNodeFactory(BLOG)

export const CollectionNode = imageArgs =>
  createNodeFactory(COLLECTION, async node => {
    if (node.products)
      node.products___NODE = node.products.edges.map(edge =>
        generateNodeId(PRODUCT, edge.node.id),
      )

    if (node.image)
      node.image.localFile___NODE = await downloadImage(
        { id: node.image.id, url: node.image.src },
        imageArgs,
      )

    return node
  })

export const ProductNode = imageArgs =>
  createNodeFactory(PRODUCT, async node => {
    if (node.variants) {
      const variants = node.variants.edges.map(edge => edge.node)
      const prices = variants.map(variant => variant.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)

      node.variants___NODE = variants.map(variant =>
        generateNodeId(PRODUCT_VARIANT, variant.id),
      )
      node.extras = {
        minPrice: prices.find(x => Number.parseFloat(x) === minPrice) || '0.00',
        maxPrice: prices.find(x => Number.parseFloat(x) === maxPrice) || '0.00',
      }
    }

    if (node.options)
      node.options___NODE = node.options.map(option =>
        generateNodeId(PRODUCT_OPTION, option.id),
      )

    if (node.images && node.images.edges && node.images.edges.length > 0)
      node.images = await Promise.all(
        node.images.edges.map(async edge => {
          edge.node.localFile___NODE = await downloadImage(
            { id: edge.node.id, url: edge.node.originalSrc },
            imageArgs,
          )
          return edge.node
        }),
      )

    return node
  })

export const ProductOptionNode = imageArgs => createNodeFactory(PRODUCT_OPTION)

export const ProductVariantNode = imageArgs =>
  createNodeFactory(PRODUCT_VARIANT, async node => {
    if (node.image)
      node.image.localFile___NODE = await downloadImage(
        { id: node.image.id, url: node.image.originalSrc },
        imageArgs,
      )

    return node
  })

export const ShopPolicyNode = createNodeFactory(SHOP_POLICY)
