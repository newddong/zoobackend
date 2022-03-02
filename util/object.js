module.export.deepClone = function deepClone(obj){
    
    if (obj === null || typeof obj !== "object") {
        return obj
    }
    
    const result = Array.isArray(obj) ? [] : {}
    
    for (let key of Object.keys(obj)) {
        result[key] = deepClone(obj[key])
    }
    
    return result
}