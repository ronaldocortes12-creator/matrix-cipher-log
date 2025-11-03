export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Não retry em erros 4xx (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        throw error;
      }
      
      // Se for a última tentativa, throw
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff com jitter
      const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
      console.log(`Retry ${i + 1}/${maxRetries} após ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}
